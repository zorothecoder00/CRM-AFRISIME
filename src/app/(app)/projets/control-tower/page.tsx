import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { Button } from "@/components/ui/button";
import { computeProjectPilotage } from "@/lib/project-pilotage";
import {
  planningRag,
  budgetRag,
  risquesRag,
  qualiteRag,
  livrablesRag,
  impactRag,
  computeImpactScore,
  type ControlTowerRow,
} from "@/lib/control-tower";
import { ControlTowerView } from "@/components/projects/control-tower-view";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Project Control Tower (cahier des charges Project Studio §42) — tableau de
 * bord central multi-projets, feux tricolores par dimension (Planning,
 * Budget, Risques, Qualité, Livrables, Impact). Complète le Pilotage
 * per-projet (onglet "Pilotage" de la fiche projet) par une vue portefeuille
 * qui permet un scan rapide de tous les projets sans les ouvrir un à un.
 */
export default async function ProjectControlTowerPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const andClauses: Prisma.ProjectWhereInput[] = [];
  const scope = projectVisibilityWhere(session!.user.roleKey, session!.user.id);
  if (scope) andClauses.push(scope);
  const entityScope = await getUserEntityScope(userId, session!.user.permissions);
  const allowedDepartmentIds = await getAllowedDepartmentIds(entityScope);
  if (allowedDepartmentIds) {
    andClauses.push({ departmentId: { in: allowedDepartmentIds } });
  }
  andClauses.push({ deletedAt: null });
  const where: Prisma.ProjectWhereInput = { AND: andClauses };

  const projects = await prisma.project.findMany({
    where,
    select: { id: true, nom: true, statut: true, avancement: true, budget: true, coutReel: true, dateFin: true },
    orderBy: { updatedAt: "desc" },
  });
  const projectIds = projects.map((p) => p.id);

  const [risks, deliverables, validationRuns, indicators] =
    projectIds.length === 0
      ? [[], [], [], []]
      : await Promise.all([
          prisma.projectRisk.findMany({
            where: { projectId: { in: projectIds } },
            select: { projectId: true, statut: true, probabilite: true, impact: true },
          }),
          prisma.projectDeliverable.findMany({
            where: { projectId: { in: projectIds } },
            select: { projectId: true, statut: true },
          }),
          prisma.taskValidationRun.findMany({
            where: { task: { projectId: { in: projectIds } }, statut: { in: ["APPROUVE", "REJETE"] } },
            select: { statut: true, task: { select: { projectId: true } } },
          }),
          prisma.indicator.findMany({
            where: { projectId: { in: projectIds } },
            select: { projectId: true, valeurCible: true, valeurActuelle: true },
          }),
        ]);

  const risksByProject = new Map<string, typeof risks>();
  for (const r of risks) risksByProject.set(r.projectId, [...(risksByProject.get(r.projectId) ?? []), r]);
  const deliverablesByProject = new Map<string, typeof deliverables>();
  for (const d of deliverables) deliverablesByProject.set(d.projectId, [...(deliverablesByProject.get(d.projectId) ?? []), d]);
  const validationRunsByProject = new Map<string, { statut: string }[]>();
  for (const v of validationRuns) {
    const pid = v.task.projectId;
    validationRunsByProject.set(pid, [...(validationRunsByProject.get(pid) ?? []), { statut: v.statut }]);
  }
  const indicatorsByProject = new Map<string, { valeurCible: number; valeurActuelle: number }[]>();
  for (const i of indicators) {
    if (!i.projectId) continue;
    const row = { valeurCible: Number(i.valeurCible), valeurActuelle: Number(i.valeurActuelle) };
    indicatorsByProject.set(i.projectId, [...(indicatorsByProject.get(i.projectId) ?? []), row]);
  }

  const rows: ControlTowerRow[] = projects.map((p) => {
    const pilotage = computeProjectPilotage({
      project: {
        avancement: p.avancement,
        budget: p.budget ? Number(p.budget) : null,
        coutReel: p.coutReel ? Number(p.coutReel) : null,
        statut: p.statut,
        dateFin: p.dateFin,
      },
      tasks: [],
      workload: [],
      risks: risksByProject.get(p.id) ?? [],
      deliverables: deliverablesByProject.get(p.id) ?? [],
      validationRuns: validationRunsByProject.get(p.id) ?? [],
    });
    const impactScore = computeImpactScore(indicatorsByProject.get(p.id) ?? []);

    return {
      id: p.id,
      nom: p.nom,
      statut: p.statut,
      avancement: p.avancement,
      planning: planningRag(pilotage),
      budget: budgetRag(pilotage),
      risques: risquesRag(pilotage),
      qualite: qualiteRag(pilotage),
      livrables: livrablesRag(pilotage),
      impact: impactRag(impactScore),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Control Tower</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} projet(s) — vue d&apos;ensemble Planning / Budget / Risques / Qualité / Livrables / Impact.
          </p>
        </div>
        <Link href="/projets">
          <Button variant="outline" size="sm">
            Retour aux projets
          </Button>
        </Link>
      </div>

      <ControlTowerView rows={rows} />
    </div>
  );
}
