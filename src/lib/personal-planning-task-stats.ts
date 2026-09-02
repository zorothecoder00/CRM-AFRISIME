import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ACTIVE_TASK_STATUSES } from "@/lib/workload";

export type TaskHealthStats = {
  totalActiveTaches: number;
  tachesNonPlanifiees: number;
  tachesEnRetard: number;
  respectDesEcheances: number | null;
};

/**
 * §43 « Planning Health » — les 4 métriques basées sur les Tâches (pas les
 * activités de planning personnel) nécessaires au score : sous-ensemble
 * ciblé de ce que /ma-journee calcule déjà pour "Ma performance" (§35/36),
 * sans les champs inutiles au score (tauxExecution, tachesTerminees,
 * tachesBloquees) — pour /planning-personnel qui n'a pas besoin du reste.
 */
export async function computeTaskHealthStats(userId: string, now: Date): Promise<TaskHealthStats> {
  const thirtyDaysAgo = subDays(now, 30);
  const activeStatuts = [...ACTIVE_TASK_STATUSES] as never[];
  const ownerFilter = { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] };

  const [totalActiveTaches, tachesNonPlanifiees, tachesEnRetard, tachesAvecEcheanceRecentes] = await Promise.all([
    prisma.task.count({ where: { ...ownerFilter, statut: { in: activeStatuts } } }),
    prisma.task.count({
      where: { ...ownerFilter, statut: { in: activeStatuts }, personalPlanningEntries: { none: {} } },
    }),
    prisma.task.count({ where: { ...ownerFilter, statut: { in: activeStatuts }, echeance: { lt: now } } }),
    prisma.task.findMany({
      where: { ...ownerFilter, statut: "TERMINEE", echeance: { not: null }, updatedAt: { gte: thirtyDaysAgo } },
      select: { echeance: true, completedAt: true },
    }),
  ]);

  const respectDesEcheances =
    tachesAvecEcheanceRecentes.length > 0
      ? Math.round(
          (tachesAvecEcheanceRecentes.filter((t) => t.completedAt && t.echeance && t.completedAt <= t.echeance).length /
            tachesAvecEcheanceRecentes.length) *
            100
        )
      : null;

  return { totalActiveTaches, tachesNonPlanifiees, tachesEnRetard, respectDesEcheances };
}
