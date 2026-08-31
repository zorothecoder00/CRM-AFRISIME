import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { ChevronLeft, ChevronRight, ListChecks, CalendarClock, CalendarDays, CalendarRange, Sparkles, Briefcase } from "lucide-react";

const TASK_STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

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

/**
 * "Mon agenda" — planning hebdomadaire/quotidien (cahier des charges §IV,
 * "Niveau 3 — Opérationnel" et "Niveau individuel"). Vue en lecture seule,
 * auto-générée depuis Task/Meeting/Event : distincte du calendrier mensuel
 * (/calendrier) ET du Planning personnel (/planning-personnel, éditable,
 * privé) — une semaine à la fois, groupée par jour, avec les tâches (date
 * de début OU échéance du jour), réunions et événements du collaborateur
 * connecté.
 */
export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const { semaine } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const refDate = semaine ? parseISO(semaine) : new Date();
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [tasks, meetings, events, missions] = await Promise.all([
    prisma.task.findMany({
      where: {
        AND: [
          { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
          // Un planning sert à voir ce qu'on doit commencer cette semaine,
          // pas seulement ce qui arrive à échéance — la date de début compte
          // autant que l'échéance pour apparaître sur cette semaine-là.
          { OR: [{ echeance: { gte: weekStart, lte: weekEnd } }, { dateDebut: { gte: weekStart, lte: weekEnd } }] },
        ],
      },
      include: { project: true },
      orderBy: { echeance: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: weekStart, lte: weekEnd } },
      include: { project: true },
      orderBy: { dateHeure: "asc" },
    }),
    prisma.event.findMany({
      where: { createdById: userId, dateDebut: { gte: weekStart, lte: weekEnd } },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.personalPlanningEntry.findMany({
      where: {
        userId,
        type: "MISSION",
        statut: { not: "ANNULEE" },
        dateDebut: { lte: weekEnd },
        dateFin: { gte: weekStart },
      },
      select: { id: true, titre: true, dateDebut: true, dateFin: true, missionDestination: true },
      orderBy: { dateDebut: "asc" },
    }),
  ]);

  const prevHref = `/planning?semaine=${format(subWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const nextHref = `/planning?semaine=${format(addWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const todayHref = `/planning`;
  const weekTotal = tasks.length + meetings.length + events.length + missions.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarRange className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Mon agenda</h1>
            <p className="text-sm text-muted-foreground">
              Semaine du {format(weekStart, "d MMMM", { locale: fr })} au {format(weekEnd, "d MMMM yyyy", { locale: fr })}
              {weekTotal > 0 && (
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

      <div className="grid gap-4 lg:grid-cols-7">
        {days.map((day) => {
          const dayMeetings = meetings.filter((m) => isSameDay(m.dateHeure, day));
          const dayEvents = events.filter((e) => isSameDay(e.dateDebut, day));
          const dayMissions = missions.filter((m) =>
            isWithinInterval(day, { start: startOfDay(m.dateDebut), end: endOfDay(m.dateFin) })
          );

          // Une tâche peut apparaître deux fois dans la semaine (un jour pour
          // son début, un autre pour son échéance) — mais une seule fois si
          // les deux tombent le même jour.
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

          const dayItems: DayItem[] = [
            ...dayMeetings.map((m): DayItem => ({ kind: "meeting", id: m.id, time: m.dateHeure, title: m.titre, href: `/reunions/${m.id}` })),
            ...dayEvents.map((e): DayItem => ({ kind: "event", id: e.id, time: e.dateDebut, title: e.titre })),
            ...dayMissions.map((m): DayItem => ({ kind: "mission", id: m.id, time: m.dateDebut, title: m.titre, destination: m.missionDestination })),
            ...dayTasks,
          ].sort((a, b) => a.time.getTime() - b.time.getTime());

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
              <CardContent className="space-y-1.5">
                {dayItems.length === 0 && (
                  <div className="flex flex-col items-center gap-1 py-3 text-center">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">Rien de prévu</p>
                  </div>
                )}

                {dayItems.map((item) => {
                  if (item.kind === "meeting") {
                    return (
                      <Link
                        key={`meeting-${item.id}`}
                        href={item.href}
                        className="flex items-start gap-1.5 rounded-md border-l-2 border-l-info bg-info/5 p-1.5 text-xs transition-colors hover:bg-info/10"
                      >
                        <CalendarClock className="mt-0.5 h-3 w-3 shrink-0 text-info" />
                        <span>
                          <span className="font-medium">{format(item.time, "HH:mm")}</span> {item.title}
                        </span>
                      </Link>
                    );
                  }
                  if (item.kind === "event") {
                    return (
                      <div
                        key={`event-${item.id}`}
                        className="flex items-start gap-1.5 rounded-md border-l-2 border-l-primary bg-primary/5 p-1.5 text-xs"
                      >
                        <CalendarDays className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        <span>
                          <span className="font-medium">{format(item.time, "HH:mm")}</span> {item.title}
                        </span>
                      </div>
                    );
                  }
                  if (item.kind === "mission") {
                    return (
                      <Link
                        key={`mission-${item.id}`}
                        href="/planning-personnel/missions"
                        className="flex items-start gap-1.5 rounded-md border-l-2 border-l-teal-500 bg-teal-500/5 p-1.5 text-xs transition-colors hover:bg-teal-500/10"
                      >
                        <Briefcase className="mt-0.5 h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />
                        <span>
                          🚗 {item.destination ? `${item.title} — ${item.destination}` : item.title}
                        </span>
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={`task-${item.id}`}
                      href={item.href}
                      className="flex items-start gap-1.5 rounded-md border-l-2 border-l-muted-foreground/30 bg-muted/30 p-1.5 text-xs transition-colors hover:bg-muted/60"
                    >
                      <ListChecks className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          <span className="font-normal text-muted-foreground">
                            {item.marker === "debut" ? "Début · " : "Échéance · "}
                          </span>
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
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
