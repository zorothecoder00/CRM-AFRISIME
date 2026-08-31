import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  format,
  parseISO,
  subYears,
  addYears,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalPlanningWeek, type PersonalPlanningDay, type PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { PersonalPlanningDay as PersonalPlanningDayView } from "@/components/personal-planning/personal-planning-day";
import { PersonalPlanningMonth } from "@/components/personal-planning/personal-planning-month";
import { PersonalPlanningAgenda } from "@/components/personal-planning/personal-planning-agenda";
import { PersonalPlanningTimeline } from "@/components/personal-planning/personal-planning-timeline";
import { PersonalPlanningList, type PersonalPlanningListRow } from "@/components/personal-planning/personal-planning-list";
import { PersonalPlanningToday } from "@/components/personal-planning/personal-planning-today";
import { PersonalPlanningEndOfDay } from "@/components/personal-planning/end-of-day";
import { PersonalPlanningViewSwitcher } from "@/components/personal-planning/view-switcher";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import { PersonalPlanningInbox, type InboxTaskRow } from "@/components/personal-planning/personal-planning-inbox";
import { PersonalPlanningDndProvider } from "@/components/personal-planning/dnd-provider";
import { RequestAvailabilityDialog } from "@/components/personal-planning/request-availability-dialog";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { PERMISSIONS } from "@/lib/permissions";
import { ReceivedRequestsSection } from "@/components/personal-planning/received-requests-section";
import { SentRequestsList } from "@/components/personal-planning/sent-requests-list";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { resolveDailyCapacity, computeDailyCharge } from "@/lib/personal-planning-workload";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { PersonalPlanningFilters } from "@/components/personal-planning/personal-planning-filters";
import { PersonalPlanningPrioritySidebar } from "@/components/personal-planning/personal-planning-priority-sidebar";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { PersonalPlanningDashboardHeader } from "@/components/personal-planning/personal-planning-dashboard-header";
import {
  ENTRY_PRIORITE_ORDER,
  ENTRY_TYPE_OPTIONS,
  type PersonalPlanningPriorite,
  type PersonalPlanningEntryStatut,
  type PersonalPlanningEntryType,
} from "@/lib/personal-planning-types";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

type Vue = "semaine" | "jour" | "mois" | "agenda" | "liste" | "timeline";

/**
 * Module "Planning personnel" (cahier des charges §1-10) : notes/créneaux
 * privés, time blocking, et activités qui planifient des Tâches existantes
 * (§4/§10) sans les dupliquer — distinct de /planning (vue agenda équipe en
 * lecture seule) et /calendrier (calendrier partagé).
 */
export default async function PlanningPersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{
    semaine?: string;
    vue?: string;
    priorite?: string;
    statut?: string;
    type?: string;
    enRetard?: string;
    aVenir?: string;
    projetId?: string;
  }>;
}) {
  const {
    semaine,
    vue: vueParam,
    priorite: prioriteParam,
    statut: statutParam,
    type: typeParam,
    enRetard: enRetardParam,
    aVenir: aVenirParam,
    projetId: activeProjetId,
  } = await searchParams;
  const activePriorities: PersonalPlanningPriorite[] = prioriteParam
    ? (prioriteParam.split(",").filter((p) => ENTRY_PRIORITE_ORDER.includes(p as PersonalPlanningPriorite)) as PersonalPlanningPriorite[])
    : ENTRY_PRIORITE_ORDER;
  const STATUT_FILTER_VALUES: PersonalPlanningEntryStatut[] = ["EN_ATTENTE", "BLOQUEE"];
  const activeStatuts: PersonalPlanningEntryStatut[] = statutParam
    ? (statutParam.split(",").filter((s) => STATUT_FILTER_VALUES.includes(s as PersonalPlanningEntryStatut)) as PersonalPlanningEntryStatut[])
    : [];
  const activeTypes: PersonalPlanningEntryType[] = typeParam
    ? (typeParam.split(",").filter((t) => ENTRY_TYPE_OPTIONS.includes(t as PersonalPlanningEntryType)) as PersonalPlanningEntryType[])
    : ENTRY_TYPE_OPTIONS;
  const isEnRetard = enRetardParam === "1";
  const isAVenir = aVenirParam === "1";
  const vue: Vue = (["semaine", "jour", "mois", "agenda", "liste", "timeline"] as const).includes(vueParam as Vue)
    ? (vueParam as Vue)
    : "semaine";
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const userName = session!.user.name ?? "Moi";

  const refDate = semaine ? parseISO(semaine) : new Date();
  const now = new Date();

  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const dayStart = startOfDay(refDate);
  const dayEnd = endOfDay(refDate);
  const monthStart = startOfMonth(refDate);
  const monthEnd = endOfMonth(refDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // §5 — les cartes "En retard"/"À venir" du tableau de bord comptent sur
  // l'ensemble du planning (voir enRetardCount/aVenirCount plus bas), pas
  // seulement la période affichée : quand on clique dessus, la période se
  // désactive pour que la liste résultante corresponde vraiment au chiffre
  // cliqué, au lieu d'être tronquée à la semaine/au mois en cours.
  const rangeStart = isEnRetard || isAVenir ? subYears(now, 2) : vue === "jour" ? dayStart : vue === "mois" ? monthGridStart : weekStart;
  const rangeEnd = isEnRetard || isAVenir ? addYears(now, 2) : vue === "jour" ? dayEnd : vue === "mois" ? monthGridEnd : weekEnd;

  // §39 — jours fériés/non ouvrables de la plage affichée, pour les marquer
  // visuellement sur les vues Semaine/Jour/Mois (en plus du blocage déjà en
  // place à la création).
  const nonWorkingMap = await findNonWorkingDaysInRange(userId, rangeStart, rangeEnd);

  const [entriesRaw, todayEntriesRaw, receivedRequests, sentRequests, colleagues, projects, tasks, objectives, inboxTasksRaw, me] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: rangeEnd }, dateFin: { gte: rangeStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: endOfDay(now) }, dateFin: { gte: startOfDay(now) } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.availabilityRequest.findMany({
      where: { targetUserId: userId, statut: "EN_ATTENTE" },
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.availabilityRequest.findMany({
      where: { requestedById: userId },
      include: { targetUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: { isActive: true, id: { not: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, projectId: true },
    }),
    prisma.objective.findMany({
      where: { userId },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true },
    }),
    // §13 — "À planifier" : tâches de l'utilisateur sans date, pas encore
    // planifiées via une activité (personalPlanningEntries: none).
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        dateDebut: null,
        personalPlanningEntries: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, titre: true, priorite: true, project: { select: { nom: true } } },
    }),
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

  // §5 — tableau de bord "Mon Planning" : "En retard"/"À venir" portent sur
  // l'ensemble du planning (pas seulement la période affichée par la vue
  // active), contrairement à `entries` filtré plus bas par `vue`/`semaine`.
  const [enRetardCount, aVenirCount] = await Promise.all([
    prisma.personalPlanningEntry.count({
      where: { userId, type: { not: "RESERVE" }, dateFin: { lt: now }, statut: { notIn: ["TERMINEE", "ANNULEE"] } },
    }),
    prisma.personalPlanningEntry.count({
      where: { userId, type: { not: "RESERVE" }, dateDebut: { gt: now }, statut: { notIn: ["TERMINEE", "ANNULEE"] } },
    }),
  ]);

  // §25 — réunions de l'utilisateur fusionnées en lecture seule dans les vues.
  const [meetingsRaw, todayMeetingsRaw] = await Promise.all([
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: startOfDay(now), lte: endOfDay(now) } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
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

  const toRow = (e: (typeof entriesRaw)[number]) => toPersonalPlanningEntryRow(e, tagsByEntry);

  const allEntries = [...entriesRaw.map(toRow), ...meetingsRaw.map(meetingToEntryRow)];
  const entries = allEntries.filter((e) => {
    if (!activePriorities.includes(e.priorite)) return false;
    if (activeStatuts.length > 0 && !activeStatuts.includes(e.statut)) return false;
    if (!activeTypes.includes(e.type)) return false;
    if (activeProjetId && e.projetId !== activeProjetId) return false;
    if (isEnRetard && !(new Date(e.dateFin) < now && !["TERMINEE", "ANNULEE"].includes(e.statut))) return false;
    if (isAVenir && !(new Date(e.dateDebut) > now && !["TERMINEE", "ANNULEE"].includes(e.statut))) return false;
    return true;
  });
  const todayEntries = [...todayEntriesRaw.map(toRow), ...todayMeetingsRaw.map(meetingToEntryRow)];

  const dailyCapacity = resolveDailyCapacity(todaySchedule, Number(me.capaciteHebdomadaireHeures), todayException);
  const charge = computeDailyCharge(todayEntries, dailyCapacity);
  const todayKey = format(now, "yyyy-MM-dd");

  // §22 — bilan de fin de journée (déplacé depuis /ma-journee, à la demande
  // de l'utilisateur). "reportée" : entrées déplacées aujourd'hui (§47
  // logAudit) dont l'ancienne date tombait aujourd'hui et la nouvelle non.
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const [movedTodayLogs, dailyReview] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId, entityType: "PersonalPlanningEntry", action: "personal_planning_entry.moved", createdAt: { gte: todayStart, lte: todayEnd } },
      select: { entityId: true, changes: true },
    }),
    prisma.personalPlanningDailyReview.findUnique({ where: { userId_date: { userId, date: todayStart } }, select: { notes: true } }),
  ]);
  const reporteesCount = new Set(
    movedTodayLogs
      .filter((log) => {
        const changes = log.changes as { dateDebut?: { avant?: string; apres?: string } } | null;
        const avant = changes?.dateDebut?.avant ? new Date(changes.dateDebut.avant) : null;
        const apres = changes?.dateDebut?.apres ? new Date(changes.dateDebut.apres) : null;
        if (!avant || !apres) return false;
        const avantEtaitAujourdhui = avant >= todayStart && avant <= todayEnd;
        const apresEstAujourdhui = apres >= todayStart && apres <= todayEnd;
        return avantEtaitAujourdhui && !apresEstAujourdhui;
      })
      .map((log) => log.entityId)
  ).size;

  const inboxTasks: InboxTaskRow[] = inboxTasksRaw.map((t) => ({
    id: t.id,
    titre: t.titre,
    priorite: t.priorite,
    projetNom: t.project.nom,
  }));

  const refData: PersonalPlanningReferenceData = {
    colleagues: colleagues.map((c) => ({ id: c.id, label: c.name })),
    projects,
    tasks,
    objectives,
  };

  // ---- Navigation (prev/next/aujourd'hui) — dépend de la vue active ----
  let prevHref: string;
  let nextHref: string;
  let periodLabel: string;
  if (vue === "jour") {
    prevHref = `/planning-personnel?vue=jour&semaine=${format(subDays(refDate, 1), "yyyy-MM-dd")}`;
    nextHref = `/planning-personnel?vue=jour&semaine=${format(addDays(refDate, 1), "yyyy-MM-dd")}`;
    periodLabel = format(refDate, "EEEE d MMMM yyyy", { locale: fr });
  } else if (vue === "mois") {
    prevHref = `/planning-personnel?vue=mois&semaine=${format(subMonths(monthStart, 1), "yyyy-MM-dd")}`;
    nextHref = `/planning-personnel?vue=mois&semaine=${format(addMonths(monthStart, 1), "yyyy-MM-dd")}`;
    periodLabel = format(monthStart, "MMMM yyyy", { locale: fr });
  } else {
    prevHref = `/planning-personnel?vue=${vue}&semaine=${format(subWeeks(weekStart, 1), "yyyy-MM-dd")}`;
    nextHref = `/planning-personnel?vue=${vue}&semaine=${format(addWeeks(weekStart, 1), "yyyy-MM-dd")}`;
    periodLabel = `Semaine du ${format(weekStart, "d MMMM", { locale: fr })} au ${format(weekEnd, "d MMMM yyyy", { locale: fr })}`;
  }
  const todayHref = `/planning-personnel?vue=${vue}`;

  const receivedRows = receivedRequests.map((r) => ({
    id: r.id,
    requestedByName: r.requestedBy.name,
    titre: r.titre,
    message: r.message,
    dateDebut: r.dateDebut.toISOString(),
    dateFin: r.dateFin.toISOString(),
  }));

  const sentRows = sentRequests.map((r) => ({
    id: r.id,
    targetUserName: r.targetUser.name,
    titre: r.titre,
    dateDebut: r.dateDebut.toISOString(),
    dateFin: r.dateFin.toISOString(),
    statut: r.statut,
    motifRefus: r.motifRefus,
  }));

  const colleagueOptions = colleagues.map((c) => ({ id: c.id, label: c.name }));

  return (
    <PersonalPlanningDndProvider>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <PersonalPlanningCrosslinks current="/planning-personnel" />

        <PersonalPlanningDashboardHeader
          userName={userName}
          today={now}
          stats={{
            aujourdHui: todayEntriesRaw.length,
            enRetard: enRetardCount,
            aVenir: aVenirCount,
            reunions: todayMeetingsRaw.length,
            chargePercent: charge.tauxOccupation,
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="size-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold">Planning personnel</h1>
              <p className="text-sm text-muted-foreground">
                Vos activités privées — distinct de{" "}
                <Link href="/planning" className="text-primary hover:underline">
                  votre agenda
                </Link>
                . Seule votre disponibilité (occupé/libre) est visible des autres.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <RequestAvailabilityDialog colleagues={colleagueOptions} />
            {session!.user.permissions.includes(PERMISSIONS.MEETING_CREATE) && (
              <MeetingFormDialog
                projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
                users={colleagueOptions}
              />
            )}
            <PersonalPlanningEntryFormDialog refData={refData} />
          </div>
        </div>

        <PersonalPlanningToday entries={todayEntries} charge={charge} todayKey={todayKey} colleagues={colleagueOptions} />

        <PersonalPlanningEndOfDay entries={todayEntries} reporteesCount={reporteesCount} todayKey={todayKey} initialNotes={dailyReview?.notes ?? null} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <PersonalPlanningViewSwitcher activeVue={vue} semaine={semaine} />
          <div className="flex items-center gap-2">
            <Link href={prevHref}>
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm capitalize text-muted-foreground">{periodLabel}</span>
            <Link href={todayHref}>
              <Button variant="outline" size="sm">
                Aujourd&apos;hui
              </Button>
            </Link>
            <Link href={nextHref}>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtres avancés (type/statut/projet/raccourcis de période) repliés
            par défaut — allège l'écran, la priorité reste visible en
            permanence dans la colonne de gauche du calendrier ci-dessous. */}
        <details className="group rounded-md border p-3 text-sm">
          <summary className="cursor-pointer select-none text-muted-foreground group-open:mb-3">Plus de filtres</summary>
          <PersonalPlanningFilters
            vue={vue}
            semaine={semaine}
            activePriorites={activePriorities}
            activeStatuts={activeStatuts}
            activeTypes={activeTypes}
            enRetard={isEnRetard}
            aVenir={isAVenir}
            projects={projects}
            activeProjetId={activeProjetId}
          />
        </details>

        <div className="grid grid-cols-[auto_1fr] gap-6">
          <PersonalPlanningPrioritySidebar
            vue={vue}
            semaine={semaine}
            activePriorites={activePriorities}
            activeStatuts={activeStatuts}
            activeTypes={activeTypes}
            enRetard={isEnRetard}
            aVenir={isAVenir}
            activeProjetId={activeProjetId}
          />

          <div className="min-w-0">
            {vue === "semaine" && (
              <PersonalPlanningWeek
                days={eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day): PersonalPlanningDay => ({
                  key: day.toISOString(),
                  dateKey: format(day, "yyyy-MM-dd"),
                  label: format(day, "EEEE d", { locale: fr }),
                  isToday: isSameDay(day, now),
                  entries: entries
                    .filter((e) => isWithinInterval(day, { start: startOfDay(new Date(e.dateDebut)), end: endOfDay(new Date(e.dateFin)) }))
                    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
                  nonWorkingReason: nonWorkingMap.get(format(day, "yyyy-MM-dd")) ?? null,
                }))}
                refData={refData}
              />
            )}

            {vue === "jour" && (
              <PersonalPlanningDayView
                day={refDate}
                entries={entries}
                refData={refData}
                nonWorkingReason={nonWorkingMap.get(format(refDate, "yyyy-MM-dd")) ?? null}
              />
            )}

            {vue === "mois" && (
              <PersonalPlanningMonth
                days={eachDayOfInterval({ start: monthGridStart, end: monthGridEnd })}
                currentMonth={monthStart}
                entriesByDate={(() => {
                  const map = new Map<string, PersonalPlanningEntryRow[]>();
                  for (const e of entries) {
                    const key = e.dateDebut.slice(0, 10);
                    const list = map.get(key) ?? [];
                    list.push(e);
                    map.set(key, list);
                  }
                  return map;
                })()}
                nonWorkingByDate={nonWorkingMap}
              />
            )}

            {vue === "agenda" && <PersonalPlanningAgenda entries={entries} />}

            {vue === "timeline" && <PersonalPlanningTimeline entries={entries} />}

            {vue === "liste" && (
              <PersonalPlanningList
                entries={entries.map((e): PersonalPlanningListRow => {
                  const raw = entriesRaw.find((r) => r.id === e.id);
                  return { ...e, responsableNom: userName, projetNom: raw ? raw.projet?.nom ?? raw.tache?.titre ?? null : "Réunion" };
                })}
                refData={refData}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <PersonalPlanningInbox tasks={inboxTasks} colleagues={colleagueOptions} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demandes reçues</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceivedRequestsSection requests={receivedRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mes demandes envoyées</CardTitle>
          </CardHeader>
          <CardContent>
            <SentRequestsList requests={sentRows} />
          </CardContent>
        </Card>
      </div>
    </div>
    </PersonalPlanningDndProvider>
  );
}
