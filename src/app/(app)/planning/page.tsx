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
  format,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { ChevronLeft, ChevronRight, ListChecks, CalendarClock, CalendarDays, CalendarRange, Sparkles } from "lucide-react";

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
  | { kind: "task"; id: string; time: Date; title: string; statut: string; priorite: string; href: string };

/**
 * Planning hebdomadaire/quotidien (cahier des charges §IV, "Niveau 3 —
 * Opérationnel" et "Niveau individuel"). Vue agenda personnelle, distincte
 * du calendrier mensuel (/calendrier) : une semaine à la fois, groupée par
 * jour, avec les tâches (échéance du jour), réunions et événements du
 * collaborateur connecté.
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

  const [tasks, meetings, events] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        echeance: { gte: weekStart, lte: weekEnd },
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
  ]);

  const prevHref = `/planning?semaine=${format(subWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const nextHref = `/planning?semaine=${format(addWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const todayHref = `/planning`;
  const weekTotal = tasks.length + meetings.length + events.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarRange className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Mon planning</h1>
            <p className="text-sm text-muted-foreground">
              Semaine du {format(weekStart, "d MMMM", { locale: fr })} au {format(weekEnd, "d MMMM yyyy", { locale: fr })}
              {weekTotal > 0 && (
                <>
                  {" · "}
                  {tasks.length > 0 && `${tasks.length} tâche${tasks.length > 1 ? "s" : ""}`}
                  {tasks.length > 0 && (meetings.length > 0 || events.length > 0) && ", "}
                  {meetings.length > 0 && `${meetings.length} réunion${meetings.length > 1 ? "s" : ""}`}
                  {meetings.length > 0 && events.length > 0 && ", "}
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
          const dayTasks = tasks.filter((t) => t.echeance && isSameDay(t.echeance, day));

          const dayItems: DayItem[] = [
            ...dayMeetings.map((m): DayItem => ({ kind: "meeting", id: m.id, time: m.dateHeure, title: m.titre, href: `/reunions/${m.id}` })),
            ...dayEvents.map((e): DayItem => ({ kind: "event", id: e.id, time: e.dateDebut, title: e.titre })),
            ...dayTasks.map((t): DayItem => ({
              kind: "task",
              id: t.id,
              time: t.echeance!,
              title: t.titre,
              statut: t.statut,
              priorite: t.priorite,
              href: `/taches/${t.id}`,
            })),
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
                  return (
                    <Link
                      key={`task-${item.id}`}
                      href={item.href}
                      className="flex items-start gap-1.5 rounded-md border-l-2 border-l-muted-foreground/30 bg-muted/30 p-1.5 text-xs transition-colors hover:bg-muted/60"
                    >
                      <ListChecks className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.title}</span>
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
