import { getServerSession } from "next-auth";
import { subDays, startOfWeek, subWeeks } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { PersonalPerformance } from "@/components/personal-planning/personal-performance";
import { PersonalPerformanceTrend, type PerformanceTrendWeek } from "@/components/personal-planning/personal-performance-trend";
import { computeWorkload, ACTIVE_TASK_STATUSES } from "@/lib/workload";
import { BarChart3 } from "lucide-react";

/**
 * "Ma performance" (prototype V2) — page dédiée (auparavant réutilisait par
 * erreur /ma-journee, une page "aujourd'hui" sans rapport). Exécution,
 * respect des échéances, charge et tendance hebdomadaire des tâches
 * terminées — rien d'autre (pas de grille horaire ni de bloc "Ma journée").
 */
export default async function PersonalPlanningPerformancePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();

  const [me, myTasks, recentlyCompletedTasks] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { capaciteHebdomadaireHeures: true } }),
    // §35/§36 — tâches actives (peu importe leur âge) + terminées/annulées
    // des 30 derniers jours, fenêtre glissante pour un signal récent.
    prisma.task.findMany({
      where: {
        AND: [
          { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
          { OR: [{ statut: { in: [...ACTIVE_TASK_STATUSES] as never[] } }, { updatedAt: { gte: subDays(now, 30) } }] },
        ],
      },
      include: { assignees: { select: { userId: true } } },
    }),
    // Tendance : tâches terminées par semaine sur les 6 dernières semaines
    // glissantes (S-5 → S), distinct de myTasks car une semaine peut
    // remonter plus loin que la fenêtre 30 jours.
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        statut: "TERMINEE",
        completedAt: { gte: startOfWeek(subWeeks(now, 5), { weekStartsOn: 1 }) },
      },
      select: { completedAt: true },
    }),
  ]);

  const [myWorkload] = computeWorkload(
    [{ id: userId, name: "", roleLabel: "", capaciteHebdomadaireHeures: Number(me.capaciteHebdomadaireHeures) }],
    myTasks.map((t) => ({
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

  const tachesTerminees = myTasks.filter((t) => t.statut === "TERMINEE");
  const tachesAvecEcheanceTerminees = tachesTerminees.filter((t) => t.echeance);
  const performanceStats = {
    tauxExecution: myTasks.length > 0 ? Math.round((tachesTerminees.length / myTasks.length) * 100) : 0,
    tachesTerminees: tachesTerminees.length,
    tachesEnRetard: myTasks.filter((t) => ACTIVE_TASK_STATUSES.has(t.statut) && t.echeance && t.echeance < now).length,
    tachesBloquees: myTasks.filter((t) => t.statut === "BLOQUEE").length,
    respectDesEcheances:
      tachesAvecEcheanceTerminees.length > 0
        ? Math.round(
            (tachesAvecEcheanceTerminees.filter((t) => t.completedAt && t.echeance && t.completedAt <= t.echeance).length /
              tachesAvecEcheanceTerminees.length) *
              100
          )
        : null,
    chargeMoyenne: myWorkload?.tauxOccupation ?? 0,
    tempsPlanifieHeures: myWorkload?.chargeHeures ?? 0,
    tempsReelHeures: myWorkload?.heuresConsommeesTotal ?? 0,
  };

  const performanceTrend: PerformanceTrendWeek[] = Array.from({ length: 6 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, 5 - i), { weekStartsOn: 1 });
    const weekEnd = subWeeks(weekStart, -1);
    const count = recentlyCompletedTasks.filter(
      (t) => t.completedAt && t.completedAt >= weekStart && t.completedAt < weekEnd
    ).length;
    return { label: i === 5 ? "S" : `S-${5 - i}`, count };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Ma performance</h1>
          <p className="text-sm text-muted-foreground">Exécution, respect des échéances, charge et efficacité.</p>
        </div>
      </div>

      <PersonalPerformance stats={performanceStats} />
      <PersonalPerformanceTrend weeks={performanceTrend} />
    </div>
  );
}
