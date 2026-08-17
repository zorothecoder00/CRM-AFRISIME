import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { TaskStatus } from "@/generated/prisma/enums";
import { collectDescendantIds, type DepartmentNode } from "@/lib/department-tree";

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];

export type ScopePilotage = {
  headcount: number;
  projectsTotal: number;
  projectsActifs: number;
  avancementMoyen: number | null;
  budgetTotal: number;
  coutReelTotal: number;
  budgetDepasseCount: number;
  tachesEnCours: number;
  tachesEnRetard: number;
  tauxRespectDelais: number | null;
  tauxOccupationMoyen: number | null;
  // V2.2 §10 — répartition à 4 niveaux, en plus de la moyenne ci-dessus.
  chargeRepartition: { sousCharge: number; chargeNormale: number; surcharge: number };
  risquesCritiques: number;
  scoreEvaluationMoyen: number | null;
};

/**
 * Indicateurs agrégés pour un périmètre donné (cahier des charges §XXIII —
 * les 7 niveaux de pilotage). Un seul calcul générique réutilisé par
 * Organisation/Direction/Département/Service/Équipe : ce qui change entre
 * ces niveaux, c'est uniquement l'ensemble d'utilisateurs/projets fourni en
 * entrée (voir getDepartmentScope), pas la logique de calcul. Projet
 * (niveau 6) a son propre calcul plus détaillé (computeProjectPilotage) et
 * Individu (niveau 7) le sien (computeIndividualPilotage).
 */
export async function computeScopePilotage(params: {
  userIds: string[];
  projectIds: string[];
}): Promise<ScopePilotage> {
  const { userIds, projectIds } = params;
  const now = new Date();

  const [users, projects, projectTasks, personTasks, risks, evaluations, leaves] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, include: { role: true } }),
    prisma.project.findMany({ where: { id: { in: projectIds } } }),
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { statut: true, echeance: true, completedAt: true },
    }),
    userIds.length > 0
      ? prisma.task.findMany({
          where: {
            OR: [{ responsablePrincipalId: { in: userIds } }, { assignees: { some: { userId: { in: userIds } } } }],
          },
          include: { assignees: { select: { userId: true } } },
        })
      : Promise.resolve([]),
    prisma.projectRisk.findMany({ where: { projectId: { in: projectIds }, statut: { notIn: ["MAITRISE", "CLOS"] } } }),
    userIds.length > 0
      ? prisma.evaluation.findMany({
          where: { evalueId: { in: userIds }, scoreGlobal: { not: null }, statut: { not: "BROUILLON" } },
          select: { scoreGlobal: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.leave.findMany({ where: { statut: "APPROUVE", userId: { in: userIds } } })
      : Promise.resolve([]),
  ]);

  const avancementMoyen =
    projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.avancement, 0) / projects.length) : null;

  const budgetTotal = projects.reduce((s, p) => s + (p.budget ? Number(p.budget) : 0), 0);
  const coutReelTotal = projects.reduce((s, p) => s + (p.coutReel ? Number(p.coutReel) : 0), 0);
  const budgetDepasseCount = projects.filter(
    (p) => p.budget !== null && p.coutReel !== null && Number(p.coutReel) > Number(p.budget)
  ).length;

  const activeSet = new Set<string>(ACTIVE_TASK_STATUSES);
  const tachesEnCours = projectTasks.filter((t) => activeSet.has(t.statut)).length;
  const tachesEnRetard = projectTasks.filter(
    (t) => activeSet.has(t.statut) && t.echeance !== null && t.echeance < now
  ).length;

  const completedWithDeadline = projectTasks.filter(
    (t) => t.statut === "TERMINEE" && t.completedAt !== null && t.echeance !== null
  );
  const aTemps = completedWithDeadline.filter((t) => t.completedAt!.getTime() <= t.echeance!.getTime()).length;
  const tauxRespectDelais =
    completedWithDeadline.length > 0 ? Math.round((aTemps / completedWithDeadline.length) * 100) : null;

  const workload = computeWorkload(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    personTasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
  );
  const tauxOccupationMoyen =
    workload.length > 0 ? Math.round(workload.reduce((s, w) => s + w.tauxOccupation, 0) / workload.length) : null;
  const chargeRepartition = {
    sousCharge: workload.filter((w) => w.statut === "SOUS_CHARGE").length,
    chargeNormale: workload.filter((w) => w.statut === "CHARGE_NORMALE").length,
    surcharge: workload.filter((w) => w.statut === "SURCHARGE").length,
  };

  const scoreEvaluationMoyen =
    evaluations.length > 0
      ? Math.round((evaluations.reduce((s, e) => s + Number(e.scoreGlobal), 0) / evaluations.length) * 100) / 100
      : null;

  return {
    headcount: users.length,
    projectsTotal: projects.length,
    projectsActifs: projects.filter((p) => p.statut === "EN_COURS").length,
    avancementMoyen,
    budgetTotal,
    coutReelTotal,
    budgetDepasseCount,
    tachesEnCours,
    tachesEnRetard,
    tauxRespectDelais,
    tauxOccupationMoyen,
    chargeRepartition,
    risquesCritiques: risks.length,
    scoreEvaluationMoyen,
  };
}

/**
 * Périmètre d'un noeud de département (niveaux Direction/Département/
 * Service) : le département lui-même + tous ses descendants (roll-up). Le
 * niveau Équipe (rattachement direct, sans descendants) utilise
 * getDirectTeamScope ci-dessous.
 */
export async function getDepartmentScope(departmentId: string, allDepartments: DepartmentNode[]) {
  const scopeIds = collectDescendantIds(departmentId, allDepartments);
  const [users, projects] = await Promise.all([
    prisma.user.findMany({ where: { departmentId: { in: scopeIds }, isActive: true }, select: { id: true } }),
    prisma.project.findMany({ where: { departmentId: { in: scopeIds } }, select: { id: true } }),
  ]);
  return { userIds: users.map((u) => u.id), projectIds: projects.map((p) => p.id), scopeIds };
}

/** Équipe (niveau 5) : rattachement direct au département, sans les descendants. */
export async function getDirectTeamScope(departmentId: string) {
  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId, isActive: true },
      select: { id: true, name: true, image: true, role: { select: { label: true } } },
    }),
    prisma.project.findMany({ where: { departmentId }, select: { id: true, nom: true, statut: true, avancement: true } }),
  ]);
  return { members: users, projects };
}
