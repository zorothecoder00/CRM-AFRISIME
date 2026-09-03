import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { PersonalPlanningWeekLoadChart, type WeekLoadDay } from "@/components/personal-planning/personal-planning-week-load-chart";
import { resolveDailyCapacity, computeDailyCharge, formatHours, groupSchedulesByWeekday } from "@/lib/personal-planning-workload";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";

/**
 * "Calendrier" (prototype V2) — analyse de charge de la semaine (KPIs +
 * graphique en barres par jour), distincte du calendrier mensuel (accessible
 * depuis "Ma journée" via son sélecteur de vue) : ce lien du sidebar montrait
 * auparavant ?vue=mois sur le hub, remplacé ici par cette vue dédiée.
 */
export default async function PersonalPlanningCalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const { semaine } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();
  const refDate = semaine ? new Date(semaine) : now;

  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [entries, meetings, me, schedules, exceptions] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: weekEnd }, dateFin: { gte: weekStart } },
      select: { dateDebut: true, dateFin: true },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: weekStart, lte: weekEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { capaciteHebdomadaireHeures: true } }),
    prisma.userWorkSchedule.findMany({ where: { userId }, include: { breaks: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } }),
    prisma.userWorkScheduleException.findMany({ where: { userId, date: { in: weekDays } } }),
  ]);

  const chargeEntries = [
    ...entries.map((e) => ({ dateDebut: e.dateDebut.toISOString(), dateFin: e.dateFin.toISOString() })),
    ...meetings.map((m) => {
      const row = meetingToEntryRow(m);
      return { dateDebut: row.dateDebut, dateFin: row.dateFin };
    }),
  ];

  const scheduleByWeekday = groupSchedulesByWeekday(schedules);
  const exceptionByDate = new Map(exceptions.map((e) => [format(e.date, "yyyy-MM-dd"), e]));

  const days: WeekLoadDay[] = weekDays.map((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const capaciteHeures = resolveDailyCapacity(
      scheduleByWeekday.get(day.getDay()) ?? null,
      Number(me.capaciteHebdomadaireHeures),
      exceptionByDate.get(dateKey) ?? null
    );
    const charge = computeDailyCharge(chargeEntries, capaciteHeures, day);
    return {
      label: format(day, "EEE", { locale: fr }),
      dateLabel: format(day, "d MMM", { locale: fr }),
      tauxOccupation: charge.tauxOccupation,
      chargeHeures: charge.chargeHeures,
      capaciteHeures: charge.capaciteHeures,
      isToday: isSameDay(day, now),
    };
  });

  const planifieTotal = Math.round(days.reduce((sum, d) => sum + d.chargeHeures, 0) * 10) / 10;
  const capaciteTotal = Math.round(days.reduce((sum, d) => sum + d.capaciteHeures, 0) * 10) / 10;
  const chargeMoyenne = capaciteTotal > 0 ? Math.round((planifieTotal / capaciteTotal) * 100) : 0;

  const prevHref = `/planning-personnel/calendrier?semaine=${format(subWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const nextHref = `/planning-personnel/calendrier?semaine=${format(addWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const todayHref = "/planning-personnel/calendrier";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div className="flex items-center gap-2">
        <CalendarRange className="size-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Calendrier — analyse de charge</h1>
          <p className="text-sm text-muted-foreground">
            Répartition de votre charge de travail sur la semaine, jour par jour.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base capitalize">
            Semaine du {format(weekStart, "d MMMM", { locale: fr })} au {format(weekEnd, "d MMMM yyyy", { locale: fr })}
          </CardTitle>
          <div className="flex items-center gap-2">
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
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3 text-center">
              <div className="text-2xl font-semibold">{formatHours(planifieTotal)}</div>
              <div className="text-xs text-muted-foreground">Planifié</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-2xl font-semibold">{formatHours(capaciteTotal)}</div>
              <div className="text-xs text-muted-foreground">Capacité</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-2xl font-semibold">{chargeMoyenne}%</div>
              <div className="text-xs text-muted-foreground">Charge moyenne</div>
            </div>
          </div>

          <PersonalPlanningWeekLoadChart days={days} />
        </CardContent>
      </Card>
    </div>
  );
}
