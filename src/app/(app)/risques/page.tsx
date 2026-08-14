import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForCriticite, toneForRiskStatus, accentForCriticite } from "@/lib/status-tone";
import { RiskFormDialog } from "@/components/risques/risk-form-dialog";
import { computeCriticite } from "@/lib/risk-matrix";
import type { RiskProbability, RiskImpact, RiskCriticite } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const STATUT_LABELS: Record<string, string> = {
  IDENTIFIE: "Identifié",
  EN_TRAITEMENT: "En traitement",
  MAITRISE: "Maîtrisé",
  SURVENU: "Survenu",
  CLOS: "Clos",
};

const CRITICITE_LABELS: Record<string, string> = {
  FAIBLE: "Faible",
  MODERE: "Modéré",
  IMPORTANT: "Important",
  ELEVE: "Élevé",
  CRITIQUE: "Critique",
};

const PROBABILITES: RiskProbability[] = ["FAIBLE", "MOYENNE", "ELEVEE"];
const IMPACTS: RiskImpact[] = ["FAIBLE", "MOYEN", "ELEVE"];
const PROBABILITE_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYENNE: "Moyenne", ELEVEE: "Élevée" };
const IMPACT_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

const CRITICITE_CELL_CLASSES: Record<RiskCriticite, string> = {
  FAIBLE: "bg-secondary/40",
  MODERE: "bg-info/15",
  IMPORTANT: "bg-warning/15",
  ELEVE: "bg-destructive/15",
  CRITIQUE: "bg-destructive/25",
};

export default async function RisquesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; criticite?: string }>;
}) {
  const { statut, criticite } = await searchParams;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.RISK_MANAGE);

  const [allRisks, users, projects, processus] = await Promise.all([
    prisma.organizationalRisk.findMany({
      include: { responsable: true, project: true, processus: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.processus.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const risks = allRisks.filter(
    (r) => (!statut || r.statut === statut) && (!criticite || r.criticite === criticite)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Registre des risques</h1>
          <p className="text-sm text-muted-foreground">{risks.length} risque(s)</p>
        </div>
        {canManage && (
          <RiskFormDialog
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
            processus={processus.map((p) => ({ id: p.id, label: p.nom }))}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matrice probabilité × impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="w-32" />
                  {IMPACTS.map((impact) => (
                    <th key={impact} className="p-2 text-xs font-medium text-muted-foreground">
                      Impact {IMPACT_LABELS[impact]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...PROBABILITES].reverse().map((probabilite) => (
                  <tr key={probabilite}>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                      Probabilité {PROBABILITE_LABELS[probabilite]}
                    </th>
                    {IMPACTS.map((impact) => {
                      const cellCriticite = computeCriticite(probabilite, impact);
                      const count = allRisks.filter(
                        (r) => r.probabilite === probabilite && r.impact === impact
                      ).length;
                      return (
                        <td
                          key={impact}
                          className={cn(
                            "rounded-md p-3 text-center align-middle",
                            CRITICITE_CELL_CLASSES[cellCriticite]
                          )}
                        >
                          <div className="text-xs text-muted-foreground">{CRITICITE_LABELS[cellCriticite]}</div>
                          <div className="text-lg font-semibold tabular-nums">{count}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/risques">
          <Badge variant={!statut && !criticite ? "default" : "outline"}>Tous</Badge>
        </Link>
        {Object.entries(CRITICITE_LABELS).map(([value, label]) => (
          <Link key={value} href={`/risques?criticite=${value}`}>
            <Badge variant={criticite === value ? "default" : "outline"}>{label}</Badge>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {risks.map((risk) => (
          <Card key={risk.id} accent={accentForCriticite(risk.criticite)}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{risk.titre}</CardTitle>
                <p className="text-xs text-muted-foreground">{risk.code}</p>
              </div>
              {canManage && (
                <RiskFormDialog
                  risk={{
                    id: risk.id,
                    titre: risk.titre,
                    description: risk.description,
                    categorie: risk.categorie,
                    origine: risk.origine,
                    probabilite: risk.probabilite,
                    impact: risk.impact,
                    responsableId: risk.responsableId,
                    projectId: risk.projectId,
                    processusId: risk.processusId,
                    mesuresPreventives: risk.mesuresPreventives,
                    planMitigation: risk.planMitigation,
                    echeance: risk.echeance ? risk.echeance.toISOString() : null,
                    statut: risk.statut,
                  }}
                  users={users.map((u) => ({ id: u.id, label: u.name }))}
                  projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
                  processus={processus.map((p) => ({ id: p.id, label: p.nom }))}
                />
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {risk.description && <p className="line-clamp-2 text-sm text-muted-foreground">{risk.description}</p>}
              <div className="flex flex-wrap gap-2">
                <Badge variant={toneForCriticite(risk.criticite)}>{CRITICITE_LABELS[risk.criticite]}</Badge>
                <Badge variant={toneForRiskStatus(risk.statut)}>{STATUT_LABELS[risk.statut]}</Badge>
                {risk.categorie && <Badge variant="outline">{risk.categorie}</Badge>}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {risk.responsable && <p>Responsable : {risk.responsable.name}</p>}
                {risk.project && <p>Projet : {risk.project.nom}</p>}
                {risk.processus && <p>Processus : {risk.processus.nom}</p>}
                {risk.echeance && <p>Échéance : {new Date(risk.echeance).toLocaleDateString("fr-FR")}</p>}
              </div>
              <Link href={`/risques/${risk.id}`} className="text-xs text-primary hover:underline">
                Voir le détail
              </Link>
            </CardContent>
          </Card>
        ))}
        {risks.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun risque pour ces filtres.</p>
        )}
      </div>
    </div>
  );
}
