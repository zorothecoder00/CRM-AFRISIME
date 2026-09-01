import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { subDays } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeWorkload, ACTIVE_TASK_STATUSES } from "@/lib/workload";
import { computeScopePilotage, getDepartmentScope } from "@/lib/pilotage-levels";
import { BackLink } from "@/components/ui/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkforceControlSimulateButton } from "@/components/personal-planning/workforce-control-simulate-button";
import { Grid3x3, BrainCircuit } from "lucide-react";

/**
 * "Workforce Control" (prototype V2, groupe Management) — remplace
 * "Niveaux de pilotage" qui n'existe pas dans le prototype : 6 KPIs
 * organisation entière + un panneau d'alerte de déséquilibre de charge.
 * "Simuler" ne persiste rien (comme le prototype lui-même, dont le bouton
 * ne fait qu'un toast côté client) — une vraie réaffectation reste un choix
 * humain explicite, fait au cas par cas depuis /taches.
 */
export default async function WorkforceControlPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/planning-personnel");
  }
  const now = new Date();

  const [users, allTasks, allDepartments] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, include: { role: true } }),
    prisma.task.findMany({ include: { assignees: { select: { userId: true } } } }),
    prisma.department.findMany({ select: { id: true, name: true, parentId: true } }),
  ]);

  const activeSet = new Set<string>(ACTIVE_TASK_STATUSES);
  const tachesActives = allTasks.filter((t) => activeSet.has(t.statut)).length;
  const tachesTerminees = allTasks.filter((t) => t.statut === "TERMINEE" && t.completedAt && t.completedAt >= subDays(now, 30)).length;
  const tachesEnRetard = allTasks.filter((t) => activeSet.has(t.statut) && t.echeance && t.echeance < now).length;
  const tachesBloquees = allTasks.filter((t) => t.statut === "BLOQUEE").length;

  const workload = computeWorkload(
    users.map((u) => ({ id: u.id, name: u.name, roleLabel: u.role.label, capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures) })),
    allTasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    []
  );
  const chargeMoyenne = workload.length > 0 ? Math.round(workload.reduce((s, w) => s + w.tauxOccupation, 0) / workload.length) : 0;

  // Départements en surcharge — même logique que /pilotage (Direction =
  // racine de l'arbre Department), un par un, une seule fois ici.
  const directions = allDepartments.filter((d) => !d.parentId);
  const directionsSurcharge = await Promise.all(
    directions.map(async (direction) => {
      const scope = await getDepartmentScope(direction.id, allDepartments);
      const pilotage = await computeScopePilotage(scope);
      return pilotage.chargeRepartition.surcharge > 0;
    })
  );
  const departementsEnSurcharge = directionsSurcharge.filter(Boolean).length;

  // Déséquilibre (heuristique déterministe, pas d'IA générative — aucune clé
  // LLM en environnement) : la personne la plus en surcharge et jusqu'à 2
  // personnes disponibles pour absorber du travail.
  const overloaded = [...workload].filter((w) => w.tauxOccupation > 100).sort((a, b) => b.tauxOccupation - a.tauxOccupation)[0];
  const available = [...workload]
    .filter((w) => w.tauxOccupation < 80 && w.userId !== overloaded?.userId)
    .sort((a, b) => a.tauxOccupation - b.tauxOccupation)
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />

      <div className="flex items-center gap-2">
        <Grid3x3 className="size-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Workforce Control</h1>
          <p className="text-sm text-muted-foreground">Vue organisation entière — charge, retards, blocages.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Tâches actives" value={tachesActives} />
        <KpiTile label="Terminées (30j)" value={tachesTerminees} />
        <KpiTile label="En retard" value={tachesEnRetard} tone={tachesEnRetard > 0 ? "destructive" : undefined} />
        <KpiTile label="Bloquées" value={tachesBloquees} tone={tachesBloquees > 0 ? "warning" : undefined} />
        <KpiTile label="Charge moyenne" value={`${chargeMoyenne}%`} tone={chargeMoyenne > 100 ? "destructive" : chargeMoyenne >= 80 ? "warning" : undefined} />
        <KpiTile
          label="Départements en surcharge"
          value={departementsEnSurcharge}
          tone={departementsEnSurcharge > 0 ? "destructive" : undefined}
        />
      </div>

      <Card accent={overloaded ? "warning" : "none"}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="h-4 w-4" />
            Déséquilibres détectés
          </CardTitle>
          {overloaded && <Badge variant="destructive">1 problème détecté</Badge>}
        </CardHeader>
        <CardContent>
          {overloaded ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Réaffectation à envisager</p>
                <p className="text-sm text-muted-foreground">
                  <strong>{overloaded.name}</strong> est en surcharge ({overloaded.tauxOccupation}%)
                  {available.length > 0 && (
                    <>
                      {" "}
                      — {available.map((a) => `${a.name} (${a.tauxOccupation}%)`).join(" et ")} ont de la disponibilité.
                    </>
                  )}
                </p>
              </div>
              <WorkforceControlSimulateButton
                overloadedName={overloaded.name}
                overloadedPercent={overloaded.tauxOccupation}
                availableNames={available.map((a) => a.name)}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune surcharge individuelle détectée pour le moment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, tone }: { label: string; value: number | string; tone?: "destructive" | "warning" }) {
  const toneClass = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "";
  return (
    <div className="rounded-md border p-3 text-center">
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
