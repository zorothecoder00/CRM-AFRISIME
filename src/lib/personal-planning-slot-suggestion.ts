import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { dateKeyOf, GRID_START_HOUR, GRID_END_HOUR } from "@/lib/personal-planning-grid";

const SEARCH_WINDOW_DAYS = 21;
const SLOT_STEP_MINUTES = 15;
const MEETING_DEFAULT_DURATION_MINUTES = 60;

type WorkWindow = { startMin: number; endMin: number; pauseStartMin: number | null; pauseEndMin: number | null };

function parseHourMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Fenêtre de travail (en minutes depuis minuit) pour un jour donné : horaire
 * configuré (UserWorkSchedule/exception) s'il existe, sinon un créneau par
 * défaut GRID_START_HOUR–GRID_END_HOUR (même plage que les vues Jour/Semaine)
 * — pas d'hypothèse de pause si rien n'est configuré.
 */
function resolveWorkWindow(
  schedule: { heureDebut: string | null; heureFin: string | null; pauseDebut: string | null; pauseFin: string | null; type: string } | null
): WorkWindow | null {
  if (schedule) {
    if (schedule.type === "ABSENCE") return null;
    if (!schedule.heureDebut || !schedule.heureFin) return null;
    return {
      startMin: parseHourMinutes(schedule.heureDebut),
      endMin: parseHourMinutes(schedule.heureFin),
      pauseStartMin: schedule.pauseDebut ? parseHourMinutes(schedule.pauseDebut) : null,
      pauseEndMin: schedule.pauseFin ? parseHourMinutes(schedule.pauseFin) : null,
    };
  }
  return { startMin: GRID_START_HOUR * 60, endMin: GRID_END_HOUR * 60, pauseStartMin: null, pauseEndMin: null };
}

function overlapsPause(window: WorkWindow, slotStartMin: number, slotEndMin: number): boolean {
  if (window.pauseStartMin === null || window.pauseEndMin === null) return false;
  return slotStartMin < window.pauseEndMin && slotEndMin > window.pauseStartMin;
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
    prisma.userWorkSchedule.findMany({ where: { userId } }),
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

  const scheduleByWeekday = new Map(schedules.map((s) => [s.jourSemaine, s]));
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
      const effective = exceptionByDate.get(dateKey) ?? scheduleByWeekday.get(cursorDay.getDay()) ?? null;
      const window = resolveWorkWindow(effective ?? null);
      if (window) {
        let slotStartMin = window.startMin;
        if (dayOffset === 0) {
          slotStartMin = Math.max(window.startMin, roundUpToStep(searchStart.getHours() * 60 + searchStart.getMinutes()));
        }
        while (slotStartMin + durationMinutes <= window.endMin) {
          const slotEndMin = slotStartMin + durationMinutes;
          if (!overlapsPause(window, slotStartMin, slotEndMin)) {
            const candidateStart = new Date(cursorDay.getFullYear(), cursorDay.getMonth(), cursorDay.getDate(), 0, slotStartMin, 0, 0);
            const candidateEnd = new Date(cursorDay.getFullYear(), cursorDay.getMonth(), cursorDay.getDate(), 0, slotEndMin, 0, 0);
            if (isFree(candidateStart, candidateEnd)) {
              return { dateDebut: candidateStart, dateFin: candidateEnd };
            }
          }
          slotStartMin += SLOT_STEP_MINUTES;
        }
      }
    }
    cursorDay = addDays(cursorDay, 1);
  }
  return null;
}
