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
  format,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { ChevronLeft, ChevronRight, ListChecks, CalendarClock, CalendarDays } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mon planning</h1>
          <p className="text-sm text-muted-foreground">
            Semaine du {format(weekStart, "d MMMM", { locale: fr })} au {format(weekEnd, "d MMMM yyyy", { locale: fr })}
          </p>
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
          const dayTasks = tasks.filter((t) => t.echeance && isSameDay(t.echeance, day));
          const dayMeetings = meetings.filter((m) => isSameDay(m.dateHeure, day));
          const dayEvents = events.filter((e) => isSameDay(e.dateDebut, day));
          const total = dayTasks.length + dayMeetings.length + dayEvents.length;

          return (
            <Card key={day.toISOString()} className={isToday(day) ? "ring-2 ring-primary/40" : ""} size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="capitalize">{format(day, "EEEE d", { locale: fr })}</span>
                  {isToday(day) && <Badge variant="default">Aujourd&apos;hui</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {total === 0 && <p className="text-xs text-muted-foreground">Rien de prévu.</p>}

                {dayMeetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/reunions/${m.id}`}
                    className="flex items-start gap-1.5 rounded-md border p-1.5 text-xs hover:bg-muted"
                  >
                    <CalendarClock className="mt-0.5 h-3 w-3 shrink-0 text-info" />
                    <span>
                      <span className="font-medium">{format(m.dateHeure, "HH:mm")}</span> {m.titre}
                    </span>
                  </Link>
                ))}

                {dayEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-1.5 rounded-md border p-1.5 text-xs">
                    <CalendarDays className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">{format(e.dateDebut, "HH:mm")}</span> {e.titre}
                    </span>
                  </div>
                ))}

                {dayTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/taches/${t.id}`}
                    className="flex items-start gap-1.5 rounded-md border p-1.5 text-xs hover:bg-muted"
                  >
                    <ListChecks className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.titre}</span>
                      <span className="flex flex-wrap gap-1">
                        <Badge variant={toneForStatus(t.statut)} className="text-[10px]">
                          {TASK_STATUS_LABELS[t.statut]}
                        </Badge>
                        <Badge variant={toneForPriority(t.priorite)} className="text-[10px]">
                          {PRIORITY_LABELS[t.priorite]}
                        </Badge>
                      </span>
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
