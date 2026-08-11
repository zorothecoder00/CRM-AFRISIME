import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonthGrid, dateKey, type CalendarDayItems } from "@/components/calendar/month-grid";
import { LeaveFormDialog } from "@/components/calendar/leave-form-dialog";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { PendingLeavesSection, type PendingLeave } from "@/components/calendar/pending-leaves-section";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string; jour?: string }>;
}) {
  const { annee, mois, jour } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canManageLeaves = session!.user.permissions.includes(PERMISSIONS.LEAVE_MANAGE);

  const now = new Date();
  const year = annee ? parseInt(annee, 10) : now.getFullYear();
  const month = mois ? parseInt(mois, 10) : now.getMonth() + 1;
  const currentMonth = new Date(year, month - 1, 1);

  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [tasks, meetings, leaves, events, projects, pendingLeaves] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        echeance: { gte: gridStart, lte: gridEnd },
      },
      select: { id: true, titre: true, echeance: true },
    }),
    prisma.meeting.findMany({
      where: {
        participants: { some: { userId } },
        dateHeure: { gte: gridStart, lte: gridEnd },
      },
      select: { id: true, titre: true, dateHeure: true },
    }),
    prisma.leave.findMany({
      where: {
        userId,
        dateDebut: { lte: gridEnd },
        dateFin: { gte: gridStart },
      },
      include: { user: true },
    }),
    prisma.event.findMany({
      where: {
        dateDebut: { lte: gridEnd },
        OR: [{ dateFin: { gte: gridStart } }, { dateFin: null, dateDebut: { gte: gridStart } }],
      },
      select: { id: true, titre: true, dateDebut: true, dateFin: true },
    }),
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    canManageLeaves
      ? prisma.leave.findMany({
          where: { statut: "EN_ATTENTE" },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const itemsByDate = new Map<string, CalendarDayItems>();
  function ensure(key: string): CalendarDayItems {
    if (!itemsByDate.has(key)) {
      itemsByDate.set(key, { tasks: [], meetings: [], leaves: [], events: [] });
    }
    return itemsByDate.get(key)!;
  }

  for (const t of tasks) {
    if (t.echeance) ensure(dateKey(t.echeance)).tasks.push({ id: t.id, titre: t.titre });
  }
  for (const m of meetings) {
    ensure(dateKey(m.dateHeure)).meetings.push({ id: m.id, titre: m.titre });
  }
  for (const day of days) {
    const key = dateKey(day);
    for (const l of leaves) {
      if (isWithinInterval(day, { start: startOfDay(l.dateDebut), end: endOfDay(l.dateFin) })) {
        ensure(key).leaves.push({ id: l.id, userName: l.user.name });
      }
    }
    for (const e of events) {
      if (
        isWithinInterval(day, {
          start: startOfDay(e.dateDebut),
          end: endOfDay(e.dateFin ?? e.dateDebut),
        })
      ) {
        ensure(key).events.push({ id: e.id, titre: e.titre });
      }
    }
  }

  const selectedKey = jour;
  const selectedItems = selectedKey ? itemsByDate.get(selectedKey) : undefined;

  const prevMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);
  const monthHref = (d: Date) => `/calendrier?annee=${d.getFullYear()}&mois=${d.getMonth() + 1}`;
  const dayHref = (key: string) => `/calendrier?annee=${year}&mois=${month}&jour=${key}`;

  const pendingLeaveRows: PendingLeave[] = pendingLeaves.map((l) => ({
    id: l.id,
    userName: l.user.name,
    type: l.type,
    dateDebut: l.dateDebut.toISOString(),
    dateFin: l.dateFin.toISOString(),
    motif: l.motif,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Calendrier</h1>
            <p className="text-sm text-muted-foreground">
              Vue consolidée de mes tâches, réunions, congés et événements.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LeaveFormDialog />
            <EventFormDialog projects={projects.map((p) => ({ id: p.id, label: p.nom }))} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link href={monthHref(prevMonth)}>
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-lg font-medium capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Link href={monthHref(nextMonth)}>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <MonthGrid
          days={days}
          currentMonth={currentMonth}
          selectedDateKey={selectedKey}
          itemsByDate={itemsByDate}
          dayHref={dayHref}
        />

        {selectedKey && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {format(parseISO(selectedKey), "EEEE d MMMM yyyy", { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!selectedItems && <p className="text-muted-foreground">Rien de prévu ce jour-là.</p>}
              {selectedItems?.tasks.map((t) => (
                <Link key={t.id} href={`/taches/${t.id}`} className="block hover:underline">
                  <Badge variant="outline" className="mr-2">
                    Tâche
                  </Badge>
                  {t.titre}
                </Link>
              ))}
              {selectedItems?.meetings.map((m) => (
                <Link key={m.id} href={`/reunions/${m.id}`} className="block hover:underline">
                  <Badge variant="outline" className="mr-2">
                    Réunion
                  </Badge>
                  {m.titre}
                </Link>
              ))}
              {selectedItems?.leaves.map((l) => (
                <div key={l.id}>
                  <Badge variant="outline" className="mr-2">
                    Congé
                  </Badge>
                  {l.userName}
                </div>
              ))}
              {selectedItems?.events.map((e) => (
                <div key={e.id}>
                  <Badge variant="outline" className="mr-2">
                    Événement
                  </Badge>
                  {e.titre}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {canManageLeaves && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Congés en attente</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingLeavesSection leaves={pendingLeaveRows} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
