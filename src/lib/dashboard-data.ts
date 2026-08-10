import { prisma } from "@/lib/prisma";
import { computeWorkload, type UserWorkload } from "@/lib/workload";
import { TaskStatus } from "@/generated/prisma/enums";

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];

export type DashboardData = {
  projectProgress: { id: string; nom: string; avancement: number; statut: string }[];
  overdueTasks: {
    id: string;
    titre: string;
    echeance: string;
    responsableName: string;
    projectNom: string;
  }[];
  overdueCount: number;
  workloadTop: UserWorkload[];
  timeSpent: { projectId: string; projectNom: string; heures: number }[];
  timeSpentTotal: number;
  deadlineCompliance: { onTime: number; late: number; total: number; percentage: number | null };
  teamProductivity: { projectId: string; projectNom: string; tachesTerminees: number }[];
  departmentPerformance: {
    departmentId: string;
    departmentName: string;
    avgAvancement: number;
    activeProjects: number;
    overdueCount: number;
  }[];
  hrIndicators: {
    departmentId: string;
    departmentName: string;
    headcount: number;
    leaveDaysThisMonth: number;
    avgOccupancy: number;
  }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    allProjects,
    departments,
    overdueTasksAll,
    users,
    tasksForWorkload,
    approvedLeaves,
    leavesThisMonth,
    completedWithDeadline,
    recentCompletedByProject,
    timeSpentByProject,
  ] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, nom: true, avancement: true, statut: true, departmentId: true },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.task.findMany({
      where: { echeance: { lt: now }, statut: { in: ACTIVE_TASK_STATUSES } },
      include: { responsablePrincipal: true, project: { select: { nom: true, departmentId: true } } },
      orderBy: { echeance: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
    }),
    prisma.task.findMany({ include: { assignees: { select: { userId: true } } } }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    prisma.leave.findMany({
      where: { statut: "APPROUVE", dateDebut: { lte: monthEnd }, dateFin: { gte: monthStart } },
      include: { user: { select: { departmentId: true } } },
    }),
    prisma.task.findMany({
      where: { statut: "TERMINEE", completedAt: { not: null }, echeance: { not: null } },
      select: { completedAt: true, echeance: true },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { statut: "TERMINEE", completedAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { tempsReelHeures: { not: null } },
      _sum: { tempsReelHeures: true },
    }),
  ]);

  const projectNameById = new Map(allProjects.map((p) => [p.id, p.nom]));

  // 1. Taux d'avancement des projets (les moins avancés en premier)
  const projectProgress = [...allProjects]
    .sort((a, b) => a.avancement - b.avancement)
    .slice(0, 10)
    .map((p) => ({ id: p.id, nom: p.nom, avancement: p.avancement, statut: p.statut }));

  // 2. Tâches en retard
  const overdueTasks = overdueTasksAll.slice(0, 10).map((t) => ({
    id: t.id,
    titre: t.titre,
    echeance: t.echeance!.toISOString(),
    responsableName: t.responsablePrincipal.name,
    projectNom: t.project.nom,
  }));

  // 3. Charge de travail (les plus chargés en premier — computeWorkload trie déjà ainsi)
  const workload = computeWorkload(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    tasksForWorkload.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    approvedLeaves.map((l) => ({
      userId: l.userId,
      dateDebut: l.dateDebut,
      dateFin: l.dateFin,
      statut: l.statut,
    }))
  );
  const workloadTop = workload.slice(0, 5);

  // 4. Temps passé
  const timeSpentAll = timeSpentByProject.map((row) => ({
    projectId: row.projectId,
    projectNom: projectNameById.get(row.projectId) ?? "—",
    heures: Number(row._sum.tempsReelHeures ?? 0),
  }));
  const timeSpentTotal = Math.round(timeSpentAll.reduce((sum, r) => sum + r.heures, 0) * 10) / 10;
  const timeSpent = [...timeSpentAll].sort((a, b) => b.heures - a.heures).slice(0, 10);

  // 5. Respect des délais
  const onTime = completedWithDeadline.filter((t) => t.completedAt! <= t.echeance!).length;
  const totalWithDeadline = completedWithDeadline.length;
  const deadlineCompliance = {
    onTime,
    late: totalWithDeadline - onTime,
    total: totalWithDeadline,
    percentage: totalWithDeadline > 0 ? Math.round((onTime / totalWithDeadline) * 100) : null,
  };

  // 6. Productivité par équipe (tâches terminées ces 30 derniers jours, par projet)
  const teamProductivity = recentCompletedByProject
    .map((row) => ({
      projectId: row.projectId,
      projectNom: projectNameById.get(row.projectId) ?? "—",
      tachesTerminees: row._count.id,
    }))
    .sort((a, b) => b.tachesTerminees - a.tachesTerminees)
    .slice(0, 10);

  // 7. Performance par département
  const overdueCountByDept = new Map<string, number>();
  for (const t of overdueTasksAll) {
    const deptId = t.project.departmentId;
    overdueCountByDept.set(deptId, (overdueCountByDept.get(deptId) ?? 0) + 1);
  }
  const departmentPerformance = departments.map((dept) => {
    const deptProjects = allProjects.filter((p) => p.departmentId === dept.id);
    const avgAvancement =
      deptProjects.length > 0
        ? Math.round(deptProjects.reduce((sum, p) => sum + p.avancement, 0) / deptProjects.length)
        : 0;
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      avgAvancement,
      activeProjects: deptProjects.length,
      overdueCount: overdueCountByDept.get(dept.id) ?? 0,
    };
  });

  // 8. Indicateurs RH
  const leaveDaysByDept = new Map<string, number>();
  for (const leave of leavesThisMonth) {
    const deptId = leave.user.departmentId;
    if (!deptId) continue;
    const effectiveStart = leave.dateDebut < monthStart ? monthStart : leave.dateDebut;
    const effectiveEnd = leave.dateFin > monthEnd ? monthEnd : leave.dateFin;
    const days = Math.max(
      1,
      Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );
    leaveDaysByDept.set(deptId, (leaveDaysByDept.get(deptId) ?? 0) + days);
  }
  const hrIndicators = departments.map((dept) => {
    const deptUsers = users.filter((u) => u.departmentId === dept.id);
    const deptWorkload = workload.filter((w) => deptUsers.some((u) => u.id === w.userId));
    const avgOccupancy =
      deptWorkload.length > 0
        ? Math.round(deptWorkload.reduce((sum, w) => sum + w.tauxOccupation, 0) / deptWorkload.length)
        : 0;
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      headcount: deptUsers.length,
      leaveDaysThisMonth: leaveDaysByDept.get(dept.id) ?? 0,
      avgOccupancy,
    };
  });

  return {
    projectProgress,
    overdueTasks,
    overdueCount: overdueTasksAll.length,
    workloadTop,
    timeSpent,
    timeSpentTotal,
    deadlineCompliance,
    teamProductivity,
    departmentPerformance,
    hrIndicators,
  };
}
