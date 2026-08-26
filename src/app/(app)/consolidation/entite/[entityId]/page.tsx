import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeEntityScopePilotage, computeEntityBudgetRollup, getRootDepartmentsForEntity } from "@/lib/consolidation";
import { entityLevelLabel, buildEntityBreadcrumb, computeEntityDepth } from "@/lib/entity-tree";
import { Building2, TriangleAlert } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";

/**
 * Drill-down d'une entité (cahier des charges V2.2 §24) — descend jusqu'à
 * ses sous-entités si elle en a, sinon passe la main aux départements
 * racines rattachés, qui pointent vers /pilotage/departement/[id] existant
 * (pas de réécriture du bas de la pyramide Direction/Département/Service).
 */
export default async function ConsolidationEntitePage({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const { entityId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ENTITY_VIEW_ALL)) {
    redirect("/dashboard");
  }

  const [entity, allEntities] = await Promise.all([
    prisma.entity.findUnique({ where: { id: entityId } }),
    prisma.entity.findMany({ select: { id: true, nom: true, parentId: true } }),
  ]);
  if (!entity) notFound();

  const byId = new Map(allEntities.map((e) => [e.id, e]));
  const breadcrumb = buildEntityBreadcrumb(entityId, byId);
  const depth = computeEntityDepth(entityId, byId);
  const children = allEntities.filter((e) => e.parentId === entityId);

  const [pilotage, budgetRollup, rootDepartments] = await Promise.all([
    computeEntityScopePilotage(entityId),
    computeEntityBudgetRollup(entityId),
    getRootDepartmentsForEntity(entityId),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/consolidation" label="Retour à la consolidation" />
      <div>
        <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {breadcrumb.map((node, i) => (
            <span key={node.id} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {node.id === entityId ? (
                <span className="font-medium text-foreground">{node.nom}</span>
              ) : (
                <Link href={`/consolidation/entite/${node.id}`} className="hover:underline">
                  {node.nom}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{entity.nom}</h1>
          <Badge variant="outline">{entityLevelLabel(depth)}</Badge>
        </div>
        {entity.pays && <p className="text-sm text-muted-foreground">{entity.pays}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicateurs consolidés</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <Info label="Effectif" value={`${pilotage.headcount}`} />
          <Info label="Projets actifs" value={`${pilotage.projectsActifs} / ${pilotage.projectsTotal}`} />
          <Info label="Avancement moyen" value={pilotage.avancementMoyen !== null ? `${pilotage.avancementMoyen}%` : "—"} />
          <Info
            label="Budget total"
            value={`${budgetRollup.budgetTotal.toLocaleString("fr-FR")} ${budgetRollup.devise}`}
          />
          <Info
            label="Coût réel total"
            value={`${budgetRollup.coutReelTotal.toLocaleString("fr-FR")} ${budgetRollup.devise}`}
          />
          <Info label="Tâches en cours" value={`${pilotage.tachesEnCours}`} />
          <Info label="Tâches en retard" value={`${pilotage.tachesEnRetard}`} />
          <Info label="Risques critiques" value={`${pilotage.risquesCritiques}`} />
          <Info
            label="Taux d'occupation moyen"
            value={pilotage.tauxOccupationMoyen !== null ? `${pilotage.tauxOccupationMoyen}%` : "—"}
          />
        </CardContent>
        {budgetRollup.conversionIncomplete && (
          <CardContent className="pt-0">
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Un ou plusieurs projets de cette entité sont dans une devise sans taux de change configuré vers{" "}
                {budgetRollup.devise} — le total ci-dessus additionne leur montant brut non converti et est donc
                probablement inexact. Renseignez le taux manquant dans{" "}
                <Link href="/administration/devises" className="underline">
                  Administration → Devises
                </Link>
                .
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {children.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Sous-entités</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link key={child.id} href={`/consolidation/entite/${child.id}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {child.nom}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Départements rattachés</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rootDepartments.map((dept) => (
              <Link key={dept.id} href={`/pilotage/departement/${dept.id}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {dept._count.users} collaborateur(s) · {dept._count.projects} projet(s)
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {rootDepartments.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun département rattaché à cette entité.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
