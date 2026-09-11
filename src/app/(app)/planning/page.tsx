import Link from "next/link";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isWeekend,
  isWithinInterval,
  startOfDay,
  endOfDay,
  format,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { PlanningViewSwitcher } from "@/components/planning/view-switcher";
import { TaskListView, type TaskRow } from "@/components/tasks/task-list-view";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ProjectFilter } from "@/components/ui/project-filter";
import { TaskPriorityFilter } from "@/components/ui/task-priority-filter";
import { TaskStatusFilter } from "@/components/ui/task-status-filter";
import { buildDateRangeFilter } from "@/lib/date-filter";
import type { Prisma } from "@/generated/prisma/client";
import { ChevronLeft, ChevronRight, ListChecks, CalendarClock, CalendarDays, CalendarRange, Sparkles, Briefcase, TriangleAlert } from "lucide-react";

const TASK_STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

const ACTIVE_TASK_STATUSES = ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE", "REPORTEE"];

type Vue = "semaine" | "jour" | "liste";

type DayItem =
  | { kind: "meeting"; id: string; time: Date; title: string; href: string }
  | { kind: "event"; id: string; time: Date; title: string }
  | { kind: "mission"; id: string; time: Date; title: string; destination: string | null }
  | {
      kind: "task";
      id: string;
      time: Date;
      title: string;
      statut: string;
      priorite: string;
      href: string;
      /** Un planning sert à voir ce qu'on doit COMMENCER cette semaine, pas
       * seulement ce qui arrive à échéance — voir la requête plus bas. */
      marker: "debut" | "echeance";
    };

function DayItemRow({ item }: { item: DayItem }) {
  if (item.kind === "meeting") {
    return (
      <Link
        href={item.href}
        className="flex items-start gap-1.5 rounded-md border-l-2 border-l-info bg-info/5 p-1.5 text-xs transition-colors hover:bg-info/10"
      >
        <CalendarClock className="mt-0.5 h-3 w-3 shrink-0 text-info" />
        <span className="min-w-0 break-words">
          <span className="font-medium">{format(item.time, "HH:mm")}</span> {item.title}
        </span>
      </Link>
    );
  }
  if (item.kind === "event") {
    return (
      <div className="flex items-start gap-1.5 rounded-md border-l-2 border-l-primary bg-primary/5 p-1.5 text-xs">
        <CalendarDays className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
        <span className="min-w-0 break-words">
          <span className="font-medium">{format(item.time, "HH:mm")}</span> {item.title}
        </span>
      </div>
    );
  }
  if (item.kind === "mission") {
    return (
      <Link
        href="/planning-personnel/missions"
        className="flex items-start gap-1.5 rounded-md border-l-2 border-l-teal-500 bg-teal-500/5 p-1.5 text-xs transition-colors hover:bg-teal-500/10"
      >
        <Briefcase className="mt-0.5 h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />
        <span className="min-w-0 break-words">
          🚗 {item.destination ? `${item.title} — ${item.destination}` : item.title}
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      className="flex items-start gap-1.5 rounded-md border-l-2 border-l-muted-foreground/30 bg-muted/30 p-1.5 text-xs transition-colors hover:bg-muted/60"
    >
      <ListChecks className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
      {/* Demande utilisateur — les titres longs doivent pouvoir se lire en
          entier (retour a la ligne) au lieu d'etre coupes par une troncature
          agressive a une seule ligne. */}
      <span className="min-w-0 break-words">
        <span className="block font-medium">
          <span className="font-normal text-muted-foreground">{item.marker === "debut" ? "Début · " : "Échéance · "}</span>
          {item.title}
        </span>
        <span className="flex flex-wrap gap-1">
          <Badge variant={toneForStatus(item.statut)} className="text-[10px]">
            {TASK_STATUS_LABELS[item.statut]}
          </Badge>
          <Badge variant={toneForPriority(item.priorite)} className="text-[10px]">
            {PRIORITY_LABELS[item.priorite]}
          </Badge>
        </span>
      </span>
    </Link>
  );
}

/**
 * "Mon agenda" — planning hebdomadaire/quotidien (cahier des charges §IV,
 * "Niveau 3 — Opérationnel" et "Niveau individuel"). Vue en lecture seule
 * (pas d'edition d'activites — a la difference de Planning personnel),
 * auto-générée depuis Task/Meeting/Event/Mission : distincte du calendrier
 * mensuel (/calendrier) ET du Planning personnel (/planning-personnel,
 * éditable, privé, avec ses propres activités).
 *
 * 3 vues (retour utilisateur — "l'onglet agenda est trop standard") :
 * Semaine (grille 7 jours, existant), Jour (une journee en detail), Liste
 * (historique complet des taches assignees, filtrable — reutilise
 * TaskListView, le meme composant que /taches et /planning-personnel/
 * mes-taches, PAS les activites personnelles de Planning personnel).
 */
export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{
    semaine?: string;
    vue?: string;
    projetId?: string;
    annee?: string;
    mois?: string;
    jour?: string;
    priorite?: string;
    statut?: string;
  }>;
}) {
  const { semaine, vue: vueParam, projetId, annee, mois, jour, priorite, statut } = await searchParams;
  const vue: Vue = (["semaine", "jour", "liste"] as const).includes(vueParam as Vue) ? (vueParam as Vue) : "semaine";
  const session = await getAppSession();
  const userId = session!.user.id;

  if (vue === "liste") {
    return (
      <PlanningListeView
        userId={userId}
        semaine={semaine}
        activeVue={vue}
        canCreate={session!.user.permissions.includes(PERMISSIONS.TASK_CREATE)}
        canManage={session!.user.permissions.includes(PERMISSIONS.TASK_UPDATE)}
        canDelete={session!.user.permissions.includes(PERMISSIONS.TASK_DELETE)}
        filters={{ projetId, annee, mois, semaine, jour, priorite, statut }}
      />
    );
  }

  // Vues Semaine/Jour — mêmes données, périmètre différent.
  const now = new Date();
  const refDate = semaine ? parseISO(semaine) : now;
  // "Periode par defaut" = aucun `semaine` explicite dans l'URL → l'utilisateur
  // regarde "maintenant", pas un historique qu'il consulte deliberement. Le
  // bandeau "Taches en retard" (voir plus bas) ne s'affiche que dans ce cas.
  const isDefaultPeriod = !semaine;

  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const rangeStart = vue === "jour" ? startOfDay(refDate) : weekStart;
  const rangeEnd = vue === "jour" ? endOfDay(refDate) : weekEnd;
  const days = vue === "jour" ? [refDate] : eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [tasks, meetings, events, missions, lateTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        AND: [
          { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
          // Un planning sert à voir ce qu'on doit commencer sur la période
          // affichée, pas seulement ce qui arrive à échéance — la date de
          // début compte autant que l'échéance.
          { OR: [{ echeance: { gte: rangeStart, lte: rangeEnd } }, { dateDebut: { gte: rangeStart, lte: rangeEnd } }] },
        ],
      },
      include: { project: true },
      orderBy: { echeance: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: rangeStart, lte: rangeEnd } },
      include: { project: true },
      orderBy: { dateHeure: "asc" },
    }),
    prisma.event.findMany({
      where: { createdById: userId, dateDebut: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.personalPlanningEntry.findMany({
      where: {
        userId,
        type: "MISSION",
        statut: { not: "ANNULEE" },
        dateDebut: { lte: rangeEnd },
        dateFin: { gte: rangeStart },
      },
      select: { id: true, titre: true, dateDebut: true, dateFin: true, missionDestination: true },
      orderBy: { dateDebut: "asc" },
    }),
    // BUG retour utilisateur — "les tâches disparaissent quand l'heure est
    // dépassée" : une tâche active en retard, issue d'une semaine passée,
    // sortait entièrement du champ de vision dès qu'on revenait à la
    // période courante. Récupérées séparément, affichées à part (bandeau
    // "En retard"), pas rattachées à un jour de la grille (elles n'en font
    // plus partie). Uniquement pour la période par défaut : consulter
    // explicitement une semaine passée ne doit pas les réinjecter.
    isDefaultPeriod
      ? prisma.task.findMany({
          where: {
            AND: [
              { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
              { statut: { in: ACTIVE_TASK_STATUSES as never[] } },
              { echeance: { lt: now } },
            ],
          },
          include: { project: true },
          orderBy: { echeance: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const idsInRange = new Set(tasks.map((t) => t.id));
  const overdueOutsideRange = lateTasks.filter((t) => !idsInRange.has(t.id));

  const prevHref =
    vue === "jour"
      ? `/planning?vue=jour&semaine=${format(subDays(refDate, 1), "yyyy-MM-dd")}`
      : `/planning?vue=semaine&semaine=${format(subWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const nextHref =
    vue === "jour"
      ? `/planning?vue=jour&semaine=${format(addDays(refDate, 1), "yyyy-MM-dd")}`
      : `/planning?vue=semaine&semaine=${format(addWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const todayHref = `/planning?vue=${vue}`;
  const periodTotal = tasks.length + meetings.length + events.length + missions.length;
  const periodLabel =
    vue === "jour"
      ? format(refDate, "EEEE d MMMM yyyy", { locale: fr })
      : `Semaine du ${format(weekStart, "d MMMM", { locale: fr })} au ${format(weekEnd, "d MMMM yyyy", { locale: fr })}`;

  function buildDayItems(day: Date): DayItem[] {
    const dayMeetings = meetings.filter((m) => isSameDay(m.dateHeure, day));
    const dayEvents = events.filter((e) => isSameDay(e.dateDebut, day));
    const dayMissions = missions.filter((m) => isWithinInterval(day, { start: startOfDay(m.dateDebut), end: endOfDay(m.dateFin) }));

    // Une tâche peut apparaître deux fois dans la période (un jour pour son
    // début, un autre pour son échéance) — mais une seule fois si les deux
    // tombent le même jour.
    const dayTasks: DayItem[] = [];
    for (const t of tasks) {
      const startsToday = t.dateDebut && isSameDay(t.dateDebut, day);
      const dueToday = t.echeance && isSameDay(t.echeance, day);
      if (startsToday) {
        dayTasks.push({
          kind: "task",
          id: `${t.id}-debut`,
          time: t.dateDebut!,
          title: t.titre,
          statut: t.statut,
          priorite: t.priorite,
          href: `/taches/${t.id}`,
          marker: "debut",
        });
      }
      if (dueToday && !(startsToday && t.dateDebut && t.echeance && isSameDay(t.dateDebut, t.echeance))) {
        dayTasks.push({
          kind: "task",
          id: `${t.id}-echeance`,
          time: t.echeance!,
          title: t.titre,
          statut: t.statut,
          priorite: t.priorite,
          href: `/taches/${t.id}`,
          marker: "echeance",
        });
      }
    }

    return [
      ...dayMeetings.map((m): DayItem => ({ kind: "meeting", id: m.id, time: m.dateHeure, title: m.titre, href: `/reunions/${m.id}` })),
      ...dayEvents.map((e): DayItem => ({ kind: "event", id: e.id, time: e.dateDebut, title: e.titre })),
      ...dayMissions.map((m): DayItem => ({ kind: "mission", id: m.id, time: m.dateDebut, title: m.titre, destination: m.missionDestination })),
      ...dayTasks,
    ].sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarRange className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Mon agenda</h1>
            <p className="text-sm text-muted-foreground">
              <span className="capitalize">{periodLabel}</span>
              {periodTotal > 0 && (
                <>
                  {" · "}
                  {tasks.length > 0 && `${tasks.length} tâche${tasks.length > 1 ? "s" : ""}`}
                  {tasks.length > 0 && (meetings.length > 0 || events.length > 0) && ", "}
                  {meetings.length > 0 && `${meetings.length} réunion${meetings.length > 1 ? "s" : ""}`}
                  {meetings.length > 0 && (missions.length > 0 || events.length > 0) && ", "}
                  {missions.length > 0 && `${missions.length} mission${missions.length > 1 ? "s" : ""}`}
                  {missions.length > 0 && events.length > 0 && ", "}
                  {events.length > 0 && `${events.length} événement${events.length > 1 ? "s" : ""}`}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlanningViewSwitcher activeVue={vue} semaine={semaine} />
          <div className="flex items-center gap-1">
            <Link href={prevHref}>
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
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
      </div>

      {overdueOutsideRange.length > 0 && (
        <Card accent="destructive">
          <CardHeader className="flex flex-row items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">
              Tâches en retard ({overdueOutsideRange.length}) — hors de la période affichée
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {overdueOutsideRange.map((t) => (
              <Link
                key={t.id}
                href={`/taches/${t.id}`}
                className="flex items-start justify-between gap-2 rounded-md border-l-2 border-l-destructive bg-destructive/5 p-1.5 text-xs transition-colors hover:bg-destructive/10"
              >
                <span className="min-w-0 break-words">
                  <span className="block font-medium text-destructive">{t.titre}</span>
                  <span className="text-muted-foreground">{t.project.nom}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                  {format(t.echeance!, "d MMM", { locale: fr })}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {vue === "jour" ? (
        <Card accent={isToday(refDate) ? "primary" : "none"}>
          <CardContent className="space-y-1.5">
            {(() => {
              const items = buildDayItems(refDate);
              if (items.length === 0) {
                return (
                  <div className="flex flex-col items-center gap-1 py-6 text-center">
                    <Sparkles className="h-4 w-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Rien de prévu ce jour-là.</p>
                  </div>
                );
              }
              return items.map((item) => <DayItemRow key={`${item.kind}-${item.id}`} item={item} />);
            })()}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-7">
          {days.map((day) => {
            const dayItems = buildDayItems(day);
            const today = isToday(day);
            const weekend = isWeekend(day);

            return (
              <Card
                key={day.toISOString()}
                size="sm"
                accent={today ? "primary" : "none"}
                className={cn(today && "ring-2 ring-primary/40", weekend && !today && "opacity-75")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-1 text-sm">
                    <span className="capitalize">{format(day, "EEEE d", { locale: fr })}</span>
                    <span className="flex items-center gap-1">
                      {dayItems.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {dayItems.length}
                        </Badge>
                      )}
                      {today && <Badge variant="default">Aujourd&apos;hui</Badge>}
                    </span>
                  </CardTitle>
                </CardHeader>
                {/* Demande utilisateur — avec beaucoup d'items ou des titres
                    longs, la carte s'etirait sans limite et rendait la grille
                    illisible. Hauteur plafonnee + defilement interne contenu. */}
                <CardContent className="max-h-80 space-y-1.5 overflow-y-auto">
                  {dayItems.length === 0 && (
                    <div className="flex flex-col items-center gap-1 py-3 text-center">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">Rien de prévu</p>
                    </div>
                  )}
                  {dayItems.map((item) => (
                    <DayItemRow key={`${item.kind}-${item.id}`} item={item} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Vue "Liste" — historique complet des tâches assignées (responsable
 * principal OU assigné), sans limite de période, filtrable. Réutilise
 * TaskListView (même composant que /taches et /planning-personnel/
 * mes-taches) — PAS les activités personnelles de Planning personnel,
 * volontairement (retour utilisateur : "ici que les tâches affectées").
 */
async function PlanningListeView({
  userId,
  semaine,
  activeVue,
  canCreate,
  canManage,
  canDelete,
  filters,
}: {
  userId: string;
  semaine?: string;
  activeVue: Vue;
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
  filters: { projetId?: string; annee?: string; mois?: string; semaine?: string; jour?: string; priorite?: string; statut?: string };
}) {
  const dateRange = buildDateRangeFilter(filters.annee, filters.mois, filters.semaine, filters.jour);

  const andClauses: Prisma.TaskWhereInput[] = [
    { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
  ];
  if (dateRange) andClauses.push({ OR: [{ echeance: dateRange }, { dateDebut: dateRange }] });
  if (filters.priorite) andClauses.push({ priorite: filters.priorite as never });
  if (filters.statut) andClauses.push({ statut: filters.statut as never });

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: filters.projetId || undefined, deletedAt: null, AND: andClauses },
      include: { project: true, responsablePrincipal: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { members: { some: { userId } } },
      include: { sections: { select: { id: true, nom: true } } },
      orderBy: { nom: "asc" },
    }),
    canManage ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const topLevelTasks = tasks.filter((t) => !t.parentTaskId);
  const taskRows: TaskRow[] = topLevelTasks.map((t) => ({
    id: t.id,
    titre: t.titre,
    description: t.description,
    projectNom: t.project.nom,
    statut: t.statut,
    priorite: t.priorite,
    responsablePrincipalId: t.responsablePrincipalId,
    responsableNom: t.responsablePrincipal.name,
    dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
    echeance: t.echeance ? t.echeance.toISOString() : null,
    tempsEstimeHeures: t.tempsEstimeHeures ? Number(t.tempsEstimeHeures) : null,
    avancement: t.avancement,
    creneau: null,
  }));

  const projectOptions = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    sections: p.sections.map((s) => ({ id: s.id, label: s.nom })),
  }));
  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarRange className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Mon agenda</h1>
            <p className="text-sm text-muted-foreground">
              {taskRows.length} tâche(s) assignée(s) — historique complet.
            </p>
          </div>
        </div>
        <PlanningViewSwitcher activeVue={activeVue} semaine={semaine} />
      </div>

      <div className="space-y-3 rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-4">
          <ProjectFilter projects={projectOptions.map((p) => ({ id: p.id, label: p.nom }))} />
          <TaskPriorityFilter />
          <TaskStatusFilter />
          <PeriodFilter dateLabel="Début/Échéance" showWeekDay />
        </div>
        <div className="border-t" />
        <TaskListView
          tasks={taskRows}
          users={userOptions}
          canManage={canManage}
          canDelete={canDelete}
          canAddSubtask={canCreate}
          showCreneau
          showCreneauColumn={false}
          titreHeader="Titre"
          showResponsable
          hoverLift3d
          className="border-0"
          currentUserId={userId}
        />
      </div>
    </div>
  );
}
