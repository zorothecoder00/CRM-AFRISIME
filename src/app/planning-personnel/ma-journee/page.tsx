import Link from "next/link";
import { getServerSession } from "next-auth";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningDay } from "@/components/personal-planning/personal-planning-day";
import { PersonalPlanningToday } from "@/components/personal-planning/personal-planning-today";
import { PlanningHealthBadge } from "@/components/personal-planning/planning-health-badge";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import { QuickCaptureButton } from "@/components/personal-planning/quick-capture-button";
import { PersonalPlanningDndProvider } from "@/components/personal-planning/dnd-provider";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { resolveDailyCapacity, computeDailyCharge, computePlanningHealth } from "@/lib/personal-planning-workload";
import { ACTIVE_TASK_STATUSES } from "@/lib/workload";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { findScheduleConflict } from "@/lib/personal-planning-conflicts";
import { PersonalPlanningConflictsCard } from "@/components/personal-planning/personal-planning-conflicts-card";
import { countReporteesToday } from "@/lib/personal-planning-reportees";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { dateKeyOf } from "@/lib/personal-planning-grid";
import { Sunrise } from "lucide-react";

/**
 * Page dédiée "Ma journée" (cahier des charges "Module Planning personnel"
 * §21 — "je recommande une page dédiée") : combine le bloc priorités/
 * surcharge (§6/§15/§16) et la grille horaire du jour (§7), distincte du
 * widget "Ma journée" affiché en plus dans `/planning-personnel`. Le bilan
 * de fin de journée (§22) vit désormais sur `/planning-personnel`, à la
 * demande de l'utilisateur.
 *
 * Vit sous /planning-personnel/* (et non plus /ma-journee à la racine) pour
 * rester dans la sidebar/topbar dédiées du module au lieu de renvoyer vers
 * le shell du dashboard principal — incohérence UX relevée par l'utilisateur.
 */
export default async function MaJourneePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const nonWorkingMap = await findNonWorkingDaysInRange(userId, now, now);
  const nonWorkingReason = nonWorkingMap.get(dateKeyOf(now)) ?? null;

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

  // Entrée du score Planning Health (tachesEnRetard/respectDesEcheances) —
  // même fenêtre glissante 30 jours que "Ma performance"
  // (/planning-personnel/performance, qui en affiche la version complète),
  // gardée ici uniquement pour alimenter PlanningHealthBadge.
  const thirtyDaysAgo = subDays(now, 30);
  const myTasks = await prisma.task.findMany({
    where: {
      AND: [
        { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
        { OR: [{ statut: { in: [...ACTIVE_TASK_STATUSES] as never[] } }, { updatedAt: { gte: thirtyDaysAgo } }] },
      ],
    },
    select: { statut: true, echeance: true, completedAt: true },
  });

  // §43 « Planning Health » — mêmes critères "à planifier" que l'inbox
  // (`/planning-personnel`) : tâche active sans activité liée.
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
    .filter(
      (c): c is { entry: (typeof realTodayEntries)[number]; conflictWith: NonNullable<(typeof conflictLabels)[number]> } =>
        c.conflictWith !== null
    );

  const tachesTerminees = myTasks.filter((t) => t.statut === "TERMINEE");
  const tachesAvecEcheanceTerminees = tachesTerminees.filter((t) => t.echeance);
  const tachesEnRetard = myTasks.filter((t) => ACTIVE_TASK_STATUSES.has(t.statut) && t.echeance && t.echeance < now).length;
  const respectDesEcheances =
    tachesAvecEcheanceTerminees.length > 0
      ? Math.round(
          (tachesAvecEcheanceTerminees.filter((t) => t.completedAt && t.echeance && t.completedAt <= t.echeance).length /
            tachesAvecEcheanceTerminees.length) *
            100
        )
      : null;

  const reporteesCount = await countReporteesToday(userId, now);

  const planningHealth = computePlanningHealth({
    totalActiveTaches: totalActiveTachesCount,
    tachesNonPlanifiees: tachesNonPlanifieesCount,
    respectDesEcheances,
    tauxOccupation: charge.tauxOccupation,
    tachesEnRetard,
    conflits: conflicts.length,
    tachesReportees: reporteesCount,
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
        <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
        <PersonalPlanningCrosslinks current="/planning-personnel/ma-journee" />

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

        <PersonalPlanningDay day={now} entries={entries} refData={refData} nonWorkingReason={nonWorkingReason} />

        <div className="flex flex-wrap items-center gap-3">
          <PlanningHealthBadge score={planningHealth} />
        </div>
      </div>
    </PersonalPlanningDndProvider>
  );
}
