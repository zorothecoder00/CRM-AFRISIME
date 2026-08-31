import Link from "next/link";
import { getServerSession } from "next-auth";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PersonalPlanningDay } from "@/components/personal-planning/personal-planning-day";
import { PersonalPlanningToday } from "@/components/personal-planning/personal-planning-today";
import { PersonalPerformance } from "@/components/personal-planning/personal-performance";
import { PlanningHealthBadge } from "@/components/personal-planning/planning-health-badge";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import { QuickCaptureButton } from "@/components/personal-planning/quick-capture-button";
import { PersonalPlanningDndProvider } from "@/components/personal-planning/dnd-provider";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { resolveDailyCapacity, computeDailyCharge, computePlanningHealth } from "@/lib/personal-planning-workload";
import { computeWorkload, ACTIVE_TASK_STATUSES } from "@/lib/workload";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { findScheduleConflict } from "@/lib/personal-planning-conflicts";
import { PersonalPlanningConflictsCard } from "@/components/personal-planning/personal-planning-conflicts-card";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { findHolidayOnDate } from "@/lib/personal-planning-holidays";
import { Sunrise } from "lucide-react";

/**
 * Page dédiée "Ma journée" (cahier des charges "Module Planning personnel"
 * §21 — "je recommande une page dédiée") : combine le bloc priorités/
 * surcharge (§6/§15/§16) et la grille horaire du jour (§7), distincte du
 * widget "Ma journée" affiché en plus dans `/planning-personnel`. Le bilan
 * de fin de journée (§22) vit désormais sur `/planning-personnel`, à la
 * demande de l'utilisateur.
 */
export default async function MaJourneePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const holidayName = await findHolidayOnDate(userId, now);

  const [entriesRaw, meetingsRaw, colleagues, projects, tasks, objectives, me] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: dayEnd }, dateFin: { gte: dayStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: dayStart, lte: dayEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { members: { some: { userId } } }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, projectId: true },
    }),
    prisma.objective.findMany({ where: { userId }, orderBy: { titre: "asc" }, select: { id: true, titre: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { capaciteHebdomadaireHeures: true } }),
  ]);

  // §40 — horaire configuré par l'utilisateur pour aujourd'hui, s'il existe.
  // §39 — dérogation ponctuelle pour la date du jour, si elle existe (prime sur le gabarit hebdomadaire).
  const [todaySchedule, todayException] = await Promise.all([
    prisma.userWorkSchedule.findUnique({
      where: { userId_jourSemaine: { userId, jourSemaine: now.getDay() } },
    }),
    prisma.userWorkScheduleException.findUnique({
      where: { userId_date: { userId, date: startOfDay(now) } },
    }),
  ]);

  // §35/§36 — "Ma performance" : tâches actives (peu importe leur âge) +
  // terminées/annulées des 30 derniers jours, fenêtre glissante pour que les
  // chiffres restent un signal récent plutôt qu'un cumul depuis toujours.
  const thirtyDaysAgo = subDays(now, 30);
  const myTasks = await prisma.task.findMany({
    where: {
      AND: [
        { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
        { OR: [{ statut: { in: [...ACTIVE_TASK_STATUSES] as never[] } }, { updatedAt: { gte: thirtyDaysAgo } }] },
      ],
    },
    include: { assignees: { select: { userId: true } } },
  });

  // §43 « Planning Health » — mêmes critères "à planifier" que l'inbox
  // (`/planning-personnel`) : tâche active sans date et sans activité liée.
  const [totalActiveTachesCount, tachesNonPlanifieesCount] = await Promise.all([
    prisma.task.count({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        statut: { in: [...ACTIVE_TASK_STATUSES] as never[] },
      },
    }),
    prisma.task.count({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        statut: { in: [...ACTIVE_TASK_STATUSES] as never[] },
        dateDebut: null,
        personalPlanningEntries: { none: {} },
      },
    }),
  ]);

  const entryIds = entriesRaw.map((e) => e.id);
  const entityTags =
    entryIds.length > 0
      ? await prisma.entityTag.findMany({
          where: { entityType: "PersonalPlanningEntry", entityId: { in: entryIds } },
          include: { tag: { select: { nom: true } } },
        })
      : [];
  const tagsByEntry = new Map<string, string[]>();
  for (const et of entityTags) {
    const list = tagsByEntry.get(et.entityId) ?? [];
    list.push(et.tag.nom);
    tagsByEntry.set(et.entityId, list);
  }

  const entries = [
    ...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, tagsByEntry)),
    ...meetingsRaw.map(meetingToEntryRow),
  ];

  const dailyCapacity = resolveDailyCapacity(todaySchedule, Number(me.capaciteHebdomadaireHeures), todayException);
  const charge = computeDailyCharge(entries, dailyCapacity);
  const todayKey = now.toISOString().slice(0, 10);

  // §42 — conflits détectés parmi les activités réelles du jour (ni
  // réservations système, ni réunions — non éditables depuis ce dialogue).
  const realTodayEntries = entries.filter((e) => e.type !== "RESERVE" && !e.meetingHref);
  const conflictLabels = await Promise.all(
    realTodayEntries.map((e) => findScheduleConflict(userId, new Date(e.dateDebut), new Date(e.dateFin), e.id))
  );
  const conflicts = realTodayEntries
    .map((entry, i) => ({ entry, conflictWith: conflictLabels[i] }))
    .filter((c): c is { entry: (typeof realTodayEntries)[number]; conflictWith: string } => c.conflictWith !== null);

  // §35/§36 — "Ma performance", calculée depuis myTasks (fenêtre 30 jours,
  // voir plus haut). computeWorkload réutilisé pour charge/temps (même
  // calcul que le dashboard équipe §37), le reste (taux d'exécution, respect
  // des échéances) est propre à cette vue individuelle.
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

  const planningHealth = computePlanningHealth({
    totalActiveTaches: totalActiveTachesCount,
    tachesNonPlanifiees: tachesNonPlanifieesCount,
    respectDesEcheances: performanceStats.respectDesEcheances,
    tauxOccupation: charge.tauxOccupation,
    tachesEnRetard: performanceStats.tachesEnRetard,
  });

  const refData: PersonalPlanningReferenceData = {
    colleagues: colleagues.map((c) => ({ id: c.id, label: c.name })),
    projects,
    tasks,
    objectives,
  };

  return (
    <PersonalPlanningDndProvider>
      <div className="space-y-4">
        <PersonalPlanningCrosslinks current="/ma-journee" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sunrise className="size-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Ma journée</h1>
              <p className="text-sm text-muted-foreground">
                {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} —{" "}
                <Link href="/planning-personnel" className="text-primary hover:underline">
                  voir le planning complet
                </Link>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickCaptureButton />
            <PersonalPlanningEntryFormDialog refData={refData} />
          </div>
        </div>

        <PersonalPlanningToday
          entries={entries}
          charge={charge}
          todayKey={todayKey}
          colleagues={colleagues.map((c) => ({ id: c.id, label: c.name }))}
        />

        <PersonalPlanningConflictsCard conflicts={conflicts} refData={refData} />

        <PersonalPlanningDay day={now} entries={entries} refData={refData} holidayName={holidayName} />

        <div className="flex flex-wrap items-center gap-3">
          <PlanningHealthBadge score={planningHealth} />
        </div>

        <PersonalPerformance stats={performanceStats} />
      </div>
    </PersonalPlanningDndProvider>
  );
}
