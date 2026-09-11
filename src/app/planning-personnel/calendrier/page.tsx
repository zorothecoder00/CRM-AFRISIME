import Link from "next/link";
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
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dateKey } from "@/components/calendar/month-grid";
import { PersonalMonthGrid, type PersonalCalendarDayItems } from "@/components/personal-planning/personal-month-grid";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { ENTRY_TYPE_META } from "@/lib/personal-planning-types";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Déjà traité — masqué du calendrier, même convention que /planning-personnel/agenda (consultable sur /planning-personnel/journal). */
const HIDDEN_STATUTS = new Set(["TERMINEE", "ANNULEE"]);

/**
 * "Calendrier" (revue 2026-09-11) — remplace l'ancienne analyse de charge
 * (redondante avec /planning-personnel/charge-de-travail, déjà dédiée à ça)
 * par un vrai calendrier mensuel, même structure que /calendrier (grille +
 * détail du jour sélectionné), mais strictement mes tâches et activités
 * personnelles — sans congés, événements organisationnels ni création
 * depuis cette page (déjà couvert par la barre d'outils du module).
 */
export default async function PersonalPlanningCalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string; jour?: string }>;
}) {
  const { annee, mois, jour } = await searchParams;
  const session = await getAppSession();
  const userId = session!.user.id;

  const now = new Date();
  const year = annee ? parseInt(annee, 10) : now.getFullYear();
  const month = mois ? parseInt(mois, 10) : now.getMonth() + 1;
  const currentMonth = new Date(year, month - 1, 1);

  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [tasks, entriesRaw, meetingsRaw] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        echeance: { gte: gridStart, lte: gridEnd },
        deletedAt: null,
      },
      select: { id: true, titre: true, echeance: true },
    }),
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: gridEnd }, dateFin: { gte: gridStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: gridStart, lte: gridEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
  ]);

  const activityRows = [
    ...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, new Map())),
    ...meetingsRaw.map(meetingToEntryRow),
  ].filter((e) => !HIDDEN_STATUTS.has(e.statut));

  const itemsByDate = new Map<string, PersonalCalendarDayItems>();
  function ensure(key: string): PersonalCalendarDayItems {
    if (!itemsByDate.has(key)) itemsByDate.set(key, { tasks: [], activities: [] });
    return itemsByDate.get(key)!;
  }

  for (const t of tasks) {
    if (t.echeance) ensure(dateKey(t.echeance)).tasks.push({ id: t.id, titre: t.titre });
  }
  for (const day of days) {
    const key = dateKey(day);
    for (const a of activityRows) {
      if (isWithinInterval(day, { start: startOfDay(new Date(a.dateDebut)), end: endOfDay(new Date(a.dateFin)) })) {
        ensure(key).activities.push({
          id: a.id,
          titre: a.titre,
          type: a.type,
          href: a.meetingHref ?? (a.tacheId ? `/taches/${a.tacheId}` : undefined),
        });
      }
    }
  }

  const selectedKey = jour;
  const selectedItems = selectedKey ? itemsByDate.get(selectedKey) : undefined;

  const prevMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);
  const monthHref = (d: Date) => `/planning-personnel/calendrier?annee=${d.getFullYear()}&mois=${d.getMonth() + 1}`;
  const dayHref = (key: string) => `/planning-personnel/calendrier?annee=${year}&mois=${month}&jour=${key}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendrier</h1>
        <p className="text-sm text-muted-foreground">Vue mensuelle de mes tâches et activités personnelles.</p>
      </div>

      <div className="flex items-center justify-between">
        <Link href={monthHref(prevMonth)}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-lg font-medium capitalize">{format(currentMonth, "MMMM yyyy", { locale: fr })}</span>
        <Link href={monthHref(nextMonth)}>
          <Button variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <PersonalMonthGrid days={days} currentMonth={currentMonth} selectedDateKey={selectedKey} itemsByDate={itemsByDate} dayHref={dayHref} />

      {selectedKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{format(parseISO(selectedKey), "EEEE d MMMM yyyy", { locale: fr })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!selectedItems && <p className="text-muted-foreground">Rien de prévu ce jour-là.</p>}
            {selectedItems?.tasks.map((t) => (
              <Link key={t.id} href={`/taches/${t.id}`} className="block hover:underline">
                <Badge variant="outline" className="mr-2">
                  Tâche
                </Badge>
                {t.titre}
              </Link>
            ))}
            {selectedItems?.activities.map((a) => {
              const content = (
                <>
                  <Badge variant="outline" className="mr-2">
                    {ENTRY_TYPE_META[a.type].label}
                  </Badge>
                  {a.titre}
                </>
              );
              return a.href ? (
                <Link key={a.id} href={a.href} className="block hover:underline">
                  {content}
                </Link>
              ) : (
                <div key={a.id}>{content}</div>
              );
            })}
            {selectedItems && selectedItems.tasks.length === 0 && selectedItems.activities.length === 0 && (
              <p className="text-muted-foreground">Rien de prévu ce jour-là.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
