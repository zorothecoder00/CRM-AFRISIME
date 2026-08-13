import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { TaskStatus } from "@/generated/prisma/enums";

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];

/** Individu (niveau 7, cahier des charges §XXIII) : performance d'un seul collaborateur. */
export async function computeIndividualPilotage(userId: string) {
  const now = new Date();

  const [user, tasks, evaluations, objectives, leaves, memberships, competences] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true, department: true },
    }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
      include: { assignees: { select: { userId: true } }, project: { select: { id: true, nom: true } } },
    }),
    prisma.evaluation.findMany({
      where: { evalueId: userId, scoreGlobal: { not: null }, statut: { not: "BROUILLON" } },
      orderBy: { dateFin: "desc" },
      select: { id: true, scoreGlobal: true, periode: true, dateFin: true },
    }),
    prisma.objective.findMany({ where: { userId } }),
    prisma.leave.findMany({ where: { userId, statut: "APPROUVE" } }),
    prisma.projectMember.findMany({ where: { userId }, include: { project: true } }),
    prisma.userCompetence.findMany({ where: { userId }, include: { competence: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const activeSet = new Set<string>(ACTIVE_TASK_STATUSES);
  const activeTasks = tasks.filter((t) => activeSet.has(t.statut));
  const overdueTasks = activeTasks.filter((t) => t.echeance !== null && t.echeance < now);

  const completedWithDeadline = tasks.filter(
    (t) => t.statut === "TERMINEE" && t.completedAt !== null && t.echeance !== null
  );
  const aTemps = completedWithDeadline.filter((t) => t.completedAt!.getTime() <= t.echeance!.getTime()).length;
  const tauxRespectDelais =
    completedWithDeadline.length > 0 ? Math.round((aTemps / completedWithDeadline.length) * 100) : null;

  const workload = computeWorkload(
    [
      {
        id: user.id,
        name: user.name,
        roleLabel: user.role.label,
        capaciteHebdomadaireHeures: Number(user.capaciteHebdomadaireHeures),
      },
    ],
    tasks.map((t) => ({
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

  const scoreEvaluationMoyen =
    evaluations.length > 0
      ? Math.round((evaluations.reduce((s, e) => s + Number(e.scoreGlobal), 0) / evaluations.length) * 100) / 100
      : null;

  return {
    user,
    tachesEnCours: activeTasks.length,
    tachesEnRetard: overdueTasks.length,
    tachesTermineesTotal: tasks.filter((t) => t.statut === "TERMINEE").length,
    tauxRespectDelais,
    tauxOccupation: workload[0]?.tauxOccupation ?? null,
    scoreEvaluationMoyen,
    dernierScore: evaluations[0] ? Number(evaluations[0].scoreGlobal) : null,
    evaluationsCount: evaluations.length,
    objectifsEnCours: objectives.filter((o) => o.statut === "EN_COURS").length,
    objectifsAtteints: objectives.filter((o) => o.statut === "ATTEINT").length,
    objectifsTotal: objectives.length,
    projects: memberships.map((m) => m.project),
    competences: competences.map((c) => ({ nom: c.competence.nom, niveau: c.niveau })),
  };
}
