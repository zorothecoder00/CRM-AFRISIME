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
import { QuickCaptureButton } from "@/components/personal-planning/quick-capture-button";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { PERMISSIONS } from "@/lib/permissions";
import { ReceivedRequestsSection } from "@/components/personal-planning/received-requests-section";
import { SentRequestsList } from "@/components/personal-planning/sent-requests-list";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { resolveDailyCapacity, computeDailyCharge, computePlanningHealthBreakdown } from "@/lib/personal-planning-workload";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { findScheduleConflict } from "@/lib/personal-planning-conflicts";
import { PersonalPlanningConflictsCard } from "@/components/personal-planning/personal-planning-conflicts-card";
import { countReporteesToday } from "@/lib/personal-planning-reportees";
import { computeTaskHealthStats } from "@/lib/personal-planning-task-stats";
import { PersonalPlanningHealthCard } from "@/components/personal-planning/personal-planning-health-card";
import { PersonalPlanningDailyLoadCard } from "@/components/personal-planning/personal-planning-daily-load-card";
import { PersonalPlanningStats } from "@/components/personal-planning/personal-planning-stats";
import { PersonalPlanningFilters } from "@/components/personal-planning/personal-planning-filters";
import {
  ENTRY_PRIORITE_ORDER,
  ENTRY_TYPE_OPTIONS,
  type PersonalPlanningPriorite,
  type PersonalPlanningEntryStatut,
  type PersonalPlanningEntryType,
} from "@/lib/personal-planning-types";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PersonalPlanningCapacityBar } from "@/components/personal-planning/personal-planning-capacity-bar";

type Vue = "semaine" | "jour" | "mois" | "agenda" | "liste" | "timeline";

/** Aperçu limité sur le hub — la liste complète reste consultable via /planning-personnel/demandes. */
const REQUESTS_PREVIEW_LIMIT = 5;

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
  // §18 (cahier de corrections UI/UX) — compteur affiché sur le bouton
  // "Filtres" pour indiquer d'un coup d'œil que des filtres sont actifs.
  const activeFilterCount =
    (activePriorities.length < ENTRY_PRIORITE_ORDER.length ? 1 : 0) +
    (activeStatuts.length > 0 ? 1 : 0) +
    (activeTypes.length < ENTRY_TYPE_OPTIONS.length ? 1 : 0) +
    (isEnRetard ? 1 : 0) +
    (isAVenir ? 1 : 0) +
    (activeProjetId ? 1 : 0);
  const vue: Vue = (["semaine", "jour", "mois", "agenda", "liste", "timeline"] as const).includes(vueParam as Vue)
    ? (vueParam as Vue)
    : "semaine";
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const userName = session!.user.name ?? "Moi";
  const canCreateTask = session!.user.permissions.includes(PERMISSIONS.TASK_CREATE);

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

  const [entriesRaw, todayEntriesRaw, receivedRequests, sentRequests, colleagues, projects, tasks, objectives, inboxTasksRaw, me, plans, competences] = await Promise.all([
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
      select: { id: true, nom: true, sections: { select: { id: true, nom: true } } },
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
    canCreateTask ? prisma.plan.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }) : Promise.resolve([]),
    canCreateTask ? prisma.competence.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }) : Promise.resolve([]),
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

  // §42 — conflits détectés parmi les activités réelles de la période affichée
  // (ni réservations système, ni réunions) ; désactivé en mode "En retard"/
  // "À venir" où la plage s'étend sur ±2 ans (voir rangeStart/rangeEnd plus
  // haut), non pertinent pour une carte "conflits de la période courante".
  const conflictCandidates = isEnRetard || isAVenir ? [] : allEntries.filter((e) => e.type !== "RESERVE" && !e.meetingHref);
  const conflictLabels = await Promise.all(
    conflictCandidates.map((e) => findScheduleConflict(userId, new Date(e.dateDebut), new Date(e.dateFin), e.id))
  );
  const conflictsRaw = conflictCandidates
    .map((entry, i) => ({ entry, conflictWith: conflictLabels[i] }))
    .filter(
      (c): c is { entry: (typeof conflictCandidates)[number]; conflictWith: NonNullable<(typeof conflictLabels)[number]> } =>
        c.conflictWith !== null
    );

  // §14 (cahier de corrections UI/UX) — "Déplacer" doit pouvoir cibler
  // l'AUTRE activité du conflit, pas seulement la première : quand l'autre
  // côté est une PersonalPlanningEntry (pas une réunion, déjà couverte par
  // meetingHref), on va chercher ses données complètes pour pouvoir
  // rouvrir son propre dialogue d'édition.
  const otherEntryIds = [...new Set(conflictsRaw.map((c) => c.conflictWith.entryId).filter((id): id is string => !!id))];
  const otherEntriesRaw =
    otherEntryIds.length > 0
      ? await prisma.personalPlanningEntry.findMany({
          where: { id: { in: otherEntryIds } },
          include: { tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } }, projet: { select: { nom: true } }, participants: { select: { userId: true } } },
        })
      : [];
  const otherEntryById = new Map(otherEntriesRaw.map((e) => [e.id, toPersonalPlanningEntryRow(e, new Map())]));
  const conflicts = conflictsRaw.map((c) => ({
    ...c,
    otherEntry: c.conflictWith.entryId ? otherEntryById.get(c.conflictWith.entryId) : undefined,
  }));

  // §22 — bilan de fin de journée (déplacé depuis /ma-journee, à la demande
  // de l'utilisateur). §43 — le même compte alimente le critère "tâches
  // reportées" du Planning Health.
  const todayStart = startOfDay(now);
  const [reporteesCount, dailyReview, taskHealthStats] = await Promise.all([
    countReporteesToday(userId, now),
    prisma.personalPlanningDailyReview.findUnique({ where: { userId_date: { userId, date: todayStart } }, select: { notes: true } }),
    computeTaskHealthStats(userId, now),
  ]);

  // §43 « Planning Health » — même formule que /ma-journee (computePlanningHealth),
  // désormais aussi affichée sur ce hub principal (voir aussi §42 pour `conflicts`).
  // Détail des 7 sous-scores (cahier de corrections UI/UX §9) exposé via
  // PersonalPlanningHealthCard, pas seulement le total.
  const planningHealthBreakdown = computePlanningHealthBreakdown({
    ...taskHealthStats,
    tauxOccupation: charge.tauxOccupation,
    conflits: conflicts.length,
    tachesReportees: reporteesCount,
  });
  const planningHealth = planningHealthBreakdown.score;

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
  const projectsForTaskForm = projects.map((p) => ({ id: p.id, nom: p.nom, sections: p.sections.map((s) => ({ id: s.id, label: s.nom })) }));
  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const plannedTodayCount = todayEntriesRaw.filter((e) => e.statut === "PLANIFIEE").length;

  return (
    <PersonalPlanningDndProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">Bonjour {userName} 👋</p>
            <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vos activités privées — distinct de{" "}
              <Link href="/planning" className="text-primary hover:underline">
                votre agenda
              </Link>
              . Seule votre disponibilité (occupé/libre) est visible des autres.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateTask && (
              <TaskFormDialog
                projects={projectsForTaskForm}
                users={colleagueOptions}
                objectives={objectives.map((o) => ({ id: o.id, label: o.titre }))}
                plans={plans.map((p) => ({ id: p.id, label: p.nom }))}
                competences={competences.map((c) => ({ id: c.id, label: c.nom }))}
              />
            )}
            <PersonalPlanningEntryFormDialog refData={refData} />
            {session!.user.permissions.includes(PERMISSIONS.MEETING_CREATE) && (
              <MeetingFormDialog projects={projects.map((p) => ({ id: p.id, label: p.nom }))} users={colleagueOptions} />
            )}
            <QuickCaptureButton />
          </div>
        </div>

        <PersonalPlanningStats
          stats={{
            tachesJour: todayEntriesRaw.length,
            tachesJourPlanifiees: plannedTodayCount,
            enRetard: enRetardCount,
            aVenir: aVenirCount,
            reunions: todayMeetingsRaw.length,
            chargePercent: charge.tauxOccupation,
            chargeHeures: charge.chargeHeures,
            capaciteHeures: charge.capaciteHeures,
            planningHealth,
          }}
        />

        <PersonalPlanningConflictsCard conflicts={conflicts} refData={refData} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <PersonalPlanningToday entries={todayEntries} charge={charge} todayKey={todayKey} colleagues={colleagueOptions} />
          </div>

          <div className="min-w-0 space-y-4">
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

            {/* §19/§20 (cahier de corrections UI/UX) — synthèse de la charge du
                jour directement au-dessus du calendrier. */}
            <PersonalPlanningCapacityBar charge={charge} />

            {/* Filtres avancés (type/statut/projet/raccourcis de période) repliés
                par défaut — allège l'écran, la priorité reste visible en
                permanence dans la colonne de gauche. Présentation en vrai
                bouton (icône + compteur) plutôt qu'un simple lien texte
                (cahier de corrections UI/UX §18 : "trop discret"). */}
            <details className="group rounded-md border text-sm">
              <summary className="flex cursor-pointer select-none items-center gap-2 rounded-md p-3 font-medium hover:bg-muted/40 group-open:border-b group-open:rounded-b-none">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-0.5 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </summary>
              <div className="p-3 pt-0">
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
              </div>
            </details>

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

            {vue === "agenda" && <PersonalPlanningAgenda entries={entries} nonWorkingByDate={nonWorkingMap} />}

            {vue === "timeline" && <PersonalPlanningTimeline entries={entries} nonWorkingByDate={nonWorkingMap} />}

            {vue === "liste" && (
              <PersonalPlanningList
                entries={entries.map((e): PersonalPlanningListRow => {
                  const raw = entriesRaw.find((r) => r.id === e.id);
                  return { ...e, responsableNom: userName, projetNom: raw ? raw.projet?.nom ?? raw.tache?.titre ?? null : "Réunion" };
                })}
                refData={refData}
                nonWorkingByDate={nonWorkingMap}
              />
            )}
          </div>

          <div id="a-planifier" className="scroll-mt-20 space-y-6">
            <PersonalPlanningInbox tasks={inboxTasks} colleagues={colleagueOptions} />
            <PersonalPlanningHealthCard score={planningHealth} criteria={planningHealthBreakdown.criteria} />
            <PersonalPlanningDailyLoadCard charge={charge} />
            <PersonalPlanningEndOfDay entries={todayEntries} reporteesCount={reporteesCount} todayKey={todayKey} initialNotes={dailyReview?.notes ?? null} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demandes reçues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ReceivedRequestsSection requests={receivedRows.slice(0, REQUESTS_PREVIEW_LIMIT)} />
              {receivedRows.length > 0 && (
                <Link
                  href="/planning-personnel/demandes?type=recues"
                  className="flex items-center justify-center gap-1 rounded-md border pt-2 pb-2 text-sm text-primary hover:bg-muted/40 hover:underline"
                >
                  Voir toutes mes demandes reçues ({receivedRows.length})
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mes demandes envoyées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SentRequestsList requests={sentRows.slice(0, REQUESTS_PREVIEW_LIMIT)} />
              {sentRows.length > 0 && (
                <Link
                  href="/planning-personnel/demandes?type=envoyees"
                  className="flex items-center justify-center gap-1 rounded-md border pt-2 pb-2 text-sm text-primary hover:bg-muted/40 hover:underline"
                >
                  Voir toutes mes demandes envoyées ({sentRows.length})
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PersonalPlanningDndProvider>
  );
}
