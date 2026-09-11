import Link from "next/link";
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
} from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, CalendarRange } from "lucide-react";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PersonalPlanningWeek, type PersonalPlanningDay, type PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { PersonalPlanningDay as PersonalPlanningDayView } from "@/components/personal-planning/personal-planning-day";
import { PersonalPlanningMonth } from "@/components/personal-planning/personal-planning-month";
import { PersonalPlanningDndProvider } from "@/components/personal-planning/dnd-provider";
import { PersonalPlanningViewSwitcher, AGENDA_CALENDAR_VIEWS } from "@/components/personal-planning/view-switcher";
import { AgendaExportButton, type AgendaExportRow } from "@/components/personal-planning/agenda-export-button";
import { AgendaShareCard } from "@/components/personal-planning/agenda-share-card";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { groupSchedulesByWeekday } from "@/lib/personal-planning-workload";

type AgendaVue = "jour" | "semaine" | "mois";

/** Demande utilisateur — statuts masqués de la vue calendrier (déjà traités), toujours consultables via le journal d'activité paginé. */
const HIDDEN_STATUTS = new Set(["TERMINEE", "ANNULEE"]);

/**
 * "Agenda" (revue 2026-09-11) — calendrier jour/semaine/mois de l'utilisateur
 * (vue jour par défaut, pour voir d'un coup d'œil ce qu'il reste à faire
 * aujourd'hui), réutilisant les mêmes composants que le hub
 * (/planning-personnel) plutôt qu'une simple chronologie ±2 ans en lecture
 * seule comme avant. Les activités déjà terminées/annulées sont masquées ici
 * — elles restent consultables sur /planning-personnel/journal (historique
 * complet paginé, lui non filtré).
 */
export default async function PersonalPlanningAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; semaine?: string }>;
}) {
  const { vue: vueParam, semaine } = await searchParams;
  const vue: AgendaVue = (["jour", "semaine", "mois"] as const).includes(vueParam as AgendaVue) ? (vueParam as AgendaVue) : "jour";

  const session = await getAppSession();
  const userId = session!.user.id;
  const now = new Date();
  const refDate = semaine ? parseISO(semaine) : now;

  const dayStart = startOfDay(refDate);
  const dayEnd = endOfDay(refDate);
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(refDate);
  const monthEnd = endOfMonth(refDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const rangeStart = vue === "jour" ? dayStart : vue === "mois" ? monthGridStart : weekStart;
  const rangeEnd = vue === "jour" ? dayEnd : vue === "mois" ? monthGridEnd : weekEnd;

  const nonWorkingMap = await findNonWorkingDaysInRange(userId, rangeStart, rangeEnd);

  const [entriesRaw, meetingsRaw, colleagues, projects, tasks, objectives, scheduleRows, shares, sharedWithMe] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: rangeEnd }, dateFin: { gte: rangeStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { members: { some: { userId } } }, orderBy: { nom: "asc" }, select: { id: true, nom: true, sections: { select: { id: true, nom: true } } } }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, projectId: true },
    }),
    prisma.objective.findMany({ where: { userId }, orderBy: { titre: "asc" }, select: { id: true, titre: true } }),
    prisma.userWorkSchedule.findMany({ where: { userId }, include: { breaks: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } }),
    // Partage d'agenda (demande utilisateur — "partager avec une secrétaire").
    prisma.personalPlanningShare.findMany({
      where: { ownerId: userId },
      include: { grantee: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.personalPlanningShare.findMany({
      where: { granteeId: userId },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const allEntries: PersonalPlanningEntryRow[] = [
    ...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, new Map())),
    ...meetingsRaw.map(meetingToEntryRow),
  ];
  // Vue calendrier — masque ce qui est déjà traité (voir HIDDEN_STATUTS) ;
  // l'export/impression ci-dessous porte sur allEntries (non filtré : un
  // agenda imprimé pour archive doit montrer ce qui s'est réellement passé).
  const visibleEntries = allEntries.filter((e) => !HIDDEN_STATUTS.has(e.statut));

  const schedulesByWeekday = groupSchedulesByWeekday(scheduleRows);

  const exportRows: AgendaExportRow[] = [...allEntries]
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
    .map((e) => ({ titre: e.titre, dateDebut: e.dateDebut, dateFin: e.dateFin, type: e.type, statut: e.statut, lieu: e.lieu }));

  const refData: PersonalPlanningReferenceData = {
    colleagues: colleagues.map((c) => ({ id: c.id, label: c.name })),
    projects,
    tasks,
    objectives,
  };

  let prevHref: string;
  let nextHref: string;
  let periodLabel: string;
  if (vue === "jour") {
    prevHref = `/planning-personnel/agenda?vue=jour&semaine=${format(subDays(refDate, 1), "yyyy-MM-dd")}`;
    nextHref = `/planning-personnel/agenda?vue=jour&semaine=${format(addDays(refDate, 1), "yyyy-MM-dd")}`;
    periodLabel = format(refDate, "EEEE d MMMM yyyy", { locale: fr });
  } else if (vue === "mois") {
    prevHref = `/planning-personnel/agenda?vue=mois&semaine=${format(subMonths(monthStart, 1), "yyyy-MM-dd")}`;
    nextHref = `/planning-personnel/agenda?vue=mois&semaine=${format(addMonths(monthStart, 1), "yyyy-MM-dd")}`;
    periodLabel = format(monthStart, "MMMM yyyy", { locale: fr });
  } else {
    prevHref = `/planning-personnel/agenda?vue=semaine&semaine=${format(subWeeks(weekStart, 1), "yyyy-MM-dd")}`;
    nextHref = `/planning-personnel/agenda?vue=semaine&semaine=${format(addWeeks(weekStart, 1), "yyyy-MM-dd")}`;
    periodLabel = `Semaine du ${format(weekStart, "d MMMM", { locale: fr })} au ${format(weekEnd, "d MMMM yyyy", { locale: fr })}`;
  }
  const todayHref = `/planning-personnel/agenda?vue=${vue}`;

  return (
    <PersonalPlanningDndProvider>
      <div className="space-y-6">

        <div className="space-y-4 rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-5 text-primary" />
              <div>
                <h1 className="text-2xl font-semibold">Agenda</h1>
                <p className="text-sm text-muted-foreground">
                  {visibleEntries.length} activité(s) à faire —{" "}
                  <Link href="/planning-personnel/journal" className="text-primary hover:underline">
                    voir le journal complet
                  </Link>
                </p>
              </div>
            </div>
            <AgendaExportButton rows={exportRows} range={{ start: rangeStart.toISOString(), end: rangeEnd.toISOString() }} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <PersonalPlanningViewSwitcher activeVue={vue} semaine={semaine} basePath="/planning-personnel/agenda" views={AGENDA_CALENDAR_VIEWS} />
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

          {vue === "jour" && (
            <PersonalPlanningDayView
              day={refDate}
              entries={visibleEntries}
              refData={refData}
              nonWorkingReason={nonWorkingMap.get(format(refDate, "yyyy-MM-dd")) ?? null}
              schedule={schedulesByWeekday.get(refDate.getDay()) ?? null}
            />
          )}

          {vue === "semaine" && (
            <PersonalPlanningWeek
              days={eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day): PersonalPlanningDay => ({
                key: day.toISOString(),
                dateKey: format(day, "yyyy-MM-dd"),
                label: format(day, "EEEE d", { locale: fr }),
                isToday: isSameDay(day, now),
                entries: visibleEntries
                  .filter((e) => isWithinInterval(day, { start: startOfDay(new Date(e.dateDebut)), end: endOfDay(new Date(e.dateFin)) }))
                  .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
                nonWorkingReason: nonWorkingMap.get(format(day, "yyyy-MM-dd")) ?? null,
                schedule: schedulesByWeekday.get(day.getDay()) ?? null,
              }))}
              refData={refData}
            />
          )}

          {vue === "mois" && (
            <PersonalPlanningMonth
              days={eachDayOfInterval({ start: monthGridStart, end: monthGridEnd })}
              currentMonth={monthStart}
              entriesByDate={(() => {
                const map = new Map<string, PersonalPlanningEntryRow[]>();
                for (const e of visibleEntries) {
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
        </div>

        <div className="print:hidden">
          <AgendaShareCard
            shares={shares.map((s) => ({ id: s.id, granteeId: s.granteeId, granteeName: s.grantee.name, role: s.role }))}
            colleagues={colleagues.map((c) => ({ id: c.id, label: c.name }))}
          />
        </div>

        {sharedWithMe.length > 0 && (
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">Agendas partagés avec moi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {sharedWithMe.map((s) => (
                <Link
                  key={s.id}
                  href={`/planning-personnel/equipe/${s.owner.id}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  {s.owner.name}
                  <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PersonalPlanningDndProvider>
  );
}
