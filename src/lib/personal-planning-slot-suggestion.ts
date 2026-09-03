import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { dateKeyOf, GRID_START_HOUR, GRID_END_HOUR } from "@/lib/personal-planning-grid";
import { groupSchedulesByWeekday, parseHourMinutes, type MultiShiftDaySchedule } from "@/lib/personal-planning-workload";

const SEARCH_WINDOW_DAYS = 21;
const SLOT_STEP_MINUTES = 15;
const MEETING_DEFAULT_DURATION_MINUTES = 60;

type WorkWindow = { startMin: number; endMin: number };

type ExceptionDaySchedule = { heureDebut: string | null; heureFin: string | null; pauseDebut: string | null; pauseFin: string | null; type: string };

/** Retire une pause (si elle existe) d'un intervalle [startMin, endMin[, en 0, 1 ou 2 sous-intervalles. */
function splitAroundBreak(startMin: number, endMin: number, pauseStartMin: number | null, pauseEndMin: number | null): WorkWindow[] {
  if (pauseStartMin === null || pauseEndMin === null || pauseEndMin <= pauseStartMin) return [{ startMin, endMin }];
  const windows: WorkWindow[] = [];
  if (pauseStartMin > startMin) windows.push({ startMin, endMin: Math.min(pauseStartMin, endMin) });
  if (pauseEndMin < endMin) windows.push({ startMin: Math.max(pauseEndMin, startMin), endMin });
  return windows;
}

/**
 * Fenêtres de travail (en minutes depuis minuit) pour un jour donné —
 * plusieurs horaires (shifts) possibles, chacun découpé autour de ses
 * propres pauses (demande utilisateur) : remplace l'ancienne fenêtre
 * unique + une seule pause. Aucun horaire configuré (schedule null) retombe
 * sur le créneau par défaut GRID_START_HOUR–GRID_END_HOUR, sans pause.
 */
function resolveWorkWindows(schedule: MultiShiftDaySchedule | null): WorkWindow[] {
  if (!schedule) return [{ startMin: GRID_START_HOUR * 60, endMin: GRID_END_HOUR * 60 }];
  if (schedule.type === "ABSENCE") return [];
  if (schedule.shifts.length === 0) return [{ startMin: GRID_START_HOUR * 60, endMin: GRID_END_HOUR * 60 }];

  const windows: WorkWindow[] = [];
  for (const shift of schedule.shifts) {
    const shiftStart = parseHourMinutes(shift.heureDebut);
    const shiftEnd = parseHourMinutes(shift.heureFin);
    const sortedBreaks = [...shift.breaks].sort((a, b) => parseHourMinutes(a.heureDebut) - parseHourMinutes(b.heureDebut));
    let cursor = shiftStart;
    for (const b of sortedBreaks) {
      const bStart = parseHourMinutes(b.heureDebut);
      const bEnd = parseHourMinutes(b.heureFin);
      if (bStart > cursor) windows.push({ startMin: cursor, endMin: Math.min(bStart, shiftEnd) });
      cursor = Math.max(cursor, bEnd);
    }
    if (cursor < shiftEnd) windows.push({ startMin: cursor, endMin: shiftEnd });
  }
  return windows.sort((a, b) => a.startMin - b.startMin);
}

/** §39 — dérogation ponctuelle : un seul horaire/une seule pause, découpé de la même façon qu'un shift. */
function resolveExceptionWindows(exception: ExceptionDaySchedule): WorkWindow[] {
  if (exception.type === "ABSENCE") return [];
  if (!exception.heureDebut || !exception.heureFin) return [];
  const startMin = parseHourMinutes(exception.heureDebut);
  const endMin = parseHourMinutes(exception.heureFin);
  const pauseStartMin = exception.pauseDebut ? parseHourMinutes(exception.pauseDebut) : null;
  const pauseEndMin = exception.pauseFin ? parseHourMinutes(exception.pauseFin) : null;
  return splitAroundBreak(startMin, endMin, pauseStartMin, pauseEndMin);
}

function roundUpToStep(minutesOfDay: number): number {
  return Math.ceil(minutesOfDay / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
}

/**
 * "À planifier" (prototype V2) — remplace le formulaire manuel vide par une
 * vraie proposition de créneau : cherche, dans les 21 prochains jours, le
 * premier créneau de `durationMinutes` qui respecte l'horaire de travail
 * (UserWorkSchedule/exceptions), évite les jours non travaillés (fériés,
 * congés approuvés, absences — mêmes règles que assertNotOnNonWorkingDay) et
 * ne chevauche aucune activité/réunion existante. Ne planifie rien lui-même
 * — la création reste un choix explicite de l'utilisateur (scheduleInboxTask),
 * cohérent avec la règle "toute automatisation reste soumise à validation
 * humaine".
 */
export async function suggestNextAvailableSlot(
  userId: string,
  durationMinutes: number,
  from: Date = new Date()
): Promise<{ dateDebut: Date; dateFin: Date } | null> {
  const searchStart = new Date(from);
  const searchEnd = addDays(searchStart, SEARCH_WINDOW_DAYS);

  const [schedules, exceptions, nonWorkingMap, entriesRaw, meetingsRaw] = await Promise.all([
    prisma.userWorkSchedule.findMany({ where: { userId }, include: { breaks: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } }),
    prisma.userWorkScheduleException.findMany({
      where: { userId, date: { gte: new Date(searchStart.getFullYear(), searchStart.getMonth(), searchStart.getDate()), lte: searchEnd } },
    }),
    findNonWorkingDaysInRange(userId, searchStart, searchEnd),
    prisma.personalPlanningEntry.findMany({
      where: { userId, statut: { notIn: ["TERMINEE", "ANNULEE"] }, dateDebut: { lt: searchEnd }, dateFin: { gt: searchStart } },
      select: { dateDebut: true, dateFin: true },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: searchStart, lte: searchEnd } },
      select: { dateHeure: true },
    }),
  ]);

  const scheduleByWeekday = groupSchedulesByWeekday(schedules);
  const exceptionByDate = new Map(exceptions.map((e) => [dateKeyOf(e.date), e]));
  const busyIntervals = [
    ...entriesRaw.map((e) => ({ start: e.dateDebut.getTime(), end: e.dateFin.getTime() })),
    ...meetingsRaw.map((m) => ({ start: m.dateHeure.getTime(), end: m.dateHeure.getTime() + MEETING_DEFAULT_DURATION_MINUTES * 60_000 })),
  ];
  const isFree = (start: Date, end: Date) => !busyIntervals.some((b) => b.start < end.getTime() && b.end > start.getTime());

  let cursorDay = new Date(searchStart.getFullYear(), searchStart.getMonth(), searchStart.getDate());
  for (let dayOffset = 0; dayOffset <= SEARCH_WINDOW_DAYS; dayOffset++) {
    const dateKey = dateKeyOf(cursorDay);
    if (!nonWorkingMap.has(dateKey)) {
      const exception = exceptionByDate.get(dateKey);
      const windows = exception ? resolveExceptionWindows(exception) : resolveWorkWindows(scheduleByWeekday.get(cursorDay.getDay()) ?? null);

      for (const window of windows) {
        let slotStartMin = window.startMin;
        if (dayOffset === 0) {
          slotStartMin = Math.max(slotStartMin, roundUpToStep(searchStart.getHours() * 60 + searchStart.getMinutes()));
        }
        while (slotStartMin + durationMinutes <= window.endMin) {
          const slotEndMin = slotStartMin + durationMinutes;
          const candidateStart = new Date(cursorDay.getFullYear(), cursorDay.getMonth(), cursorDay.getDate(), 0, slotStartMin, 0, 0);
          const candidateEnd = new Date(cursorDay.getFullYear(), cursorDay.getMonth(), cursorDay.getDate(), 0, slotEndMin, 0, 0);
          if (isFree(candidateStart, candidateEnd)) {
            return { dateDebut: candidateStart, dateFin: candidateEnd };
          }
          slotStartMin += SLOT_STEP_MINUTES;
        }
      }
    }
    cursorDay = addDays(cursorDay, 1);
  }
  return null;
}
