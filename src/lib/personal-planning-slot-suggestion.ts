import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { dateKeyOf, GRID_START_HOUR, GRID_END_HOUR } from "@/lib/personal-planning-grid";
import { groupSchedulesByWeekday, parseHourMinutes, type MultiShiftDaySchedule } from "@/lib/personal-planning-workload";

const SEARCH_WINDOW_DAYS = 21;
const SLOT_STEP_MINUTES = 15;
const MEETING_DEFAULT_DURATION_MINUTES = 60;

export type WorkWindow = { startMin: number; endMin: number };

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
  from: Date = new Date(),
  /** Demande utilisateur — planifier une tâche depuis "À planifier" ne doit
   * jamais déplacer sa date d'échéance : passer 0 restreint la recherche au
   * seul jour de `from` (voir suggestScheduleSlot). */
  maxDays: number = SEARCH_WINDOW_DAYS
): Promise<{ dateDebut: Date; dateFin: Date } | null> {
  const searchStart = new Date(from);
  // Bug reel de production — bornait la recherche des entrees/reunions deja
  // posees sur [searchStart, searchStart + maxDays[ EN HEURE EXACTE, pas en
  // jours pleins : avec maxDays=0 (recherche restreinte au jour de la tache,
  // voir suggestScheduleSlot) et searchStart a minuit, cette borne devenait
  // un intervalle de largeur ZERO — aucune activite de la journee n'etait
  // alors jamais vue comme occupee, donc TOUJOURS le tout premier creneau de
  // la fenetre de travail etait "suggere", meme deja pris. La confirmation
  // (scheduleInboxTask, qui refait une vraie requete) rejetait alors
  // systematiquement ce mauvais creneau. searchEnd doit couvrir le jour
  // entier du dernier jour cherche, quelle que soit l'heure de `from`.
  const searchStartDay = new Date(searchStart.getFullYear(), searchStart.getMonth(), searchStart.getDate());
  const searchEnd = addDays(searchStartDay, maxDays + 1);

  const [schedules, exceptions, nonWorkingMap, entriesRaw, meetingsRaw] = await Promise.all([
    prisma.userWorkSchedule.findMany({ where: { userId }, include: { breaks: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } }),
    prisma.userWorkScheduleException.findMany({
      where: { userId, date: { gte: searchStartDay, lte: searchEnd } },
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
  for (let dayOffset = 0; dayOffset <= maxDays; dayOffset++) {
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

export function formatMinutesOfDay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Demande utilisateur — quand une confirmation manuelle tombe sur un
 * conflit d'horaire, dire précisément quels créneaux sont réellement
 * libres CE jour-là (pas juste "choisissez un autre créneau"), voir
 * scheduleInboxTask. Soustrait les activités/réunions déjà posées des
 * fenêtres de travail (mêmes règles que suggestNextAvailableSlot), sans
 * borner à une durée minimale — les vrais trous, même courts.
 */
export async function listFreeWindowsForDay(userId: string, day: Date): Promise<WorkWindow[]> {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = addDays(dayStart, 1);

  const [schedules, exception, nonWorkingMap, entriesRaw, meetingsRaw] = await Promise.all([
    prisma.userWorkSchedule.findMany({ where: { userId }, include: { breaks: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } }),
    prisma.userWorkScheduleException.findFirst({ where: { userId, date: { gte: dayStart, lt: dayEnd } } }),
    findNonWorkingDaysInRange(userId, dayStart, dayStart),
    prisma.personalPlanningEntry.findMany({
      where: { userId, statut: { notIn: ["TERMINEE", "ANNULEE"] }, dateDebut: { lt: dayEnd }, dateFin: { gt: dayStart } },
      select: { dateDebut: true, dateFin: true },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: dayStart, lt: dayEnd } },
      select: { dateHeure: true },
    }),
  ]);

  if (nonWorkingMap.has(dateKeyOf(dayStart))) return [];

  const scheduleByWeekday = groupSchedulesByWeekday(schedules);
  const windows = exception
    ? resolveExceptionWindows(exception)
    : resolveWorkWindows(scheduleByWeekday.get(dayStart.getDay()) ?? null);

  const toMinOfDay = (d: Date) => Math.max(0, Math.min(24 * 60, (d.getTime() - dayStart.getTime()) / 60_000));
  const busy = [
    ...entriesRaw.map((e) => ({ startMin: toMinOfDay(e.dateDebut), endMin: toMinOfDay(e.dateFin) })),
    ...meetingsRaw.map((m) => ({
      startMin: toMinOfDay(m.dateHeure),
      endMin: toMinOfDay(new Date(m.dateHeure.getTime() + MEETING_DEFAULT_DURATION_MINUTES * 60_000)),
    })),
  ].sort((a, b) => a.startMin - b.startMin);

  const free: WorkWindow[] = [];
  for (const window of windows) {
    let cursor = window.startMin;
    for (const b of busy) {
      if (b.endMin <= cursor || b.startMin >= window.endMin) continue;
      if (b.startMin > cursor) free.push({ startMin: cursor, endMin: Math.min(b.startMin, window.endMin) });
      cursor = Math.max(cursor, b.endMin);
      if (cursor >= window.endMin) break;
    }
    if (cursor < window.endMin) free.push({ startMin: cursor, endMin: window.endMin });
  }
  return free.filter((w) => w.endMin > w.startMin);
}

const MIN_REDUCED_SLOT_MINUTES = 15;

/**
 * Demande utilisateur — quand la durée demandée ne tient dans aucun trou
 * libre d'un seul tenant ce jour-là (ex. tâche estimée à 3h, mais aucun
 * créneau de 3h dispo), proposer quand même le PLUS GRAND trou réellement
 * disponible plutôt que rien : la personne peut alors faire une session plus
 * courte (ex. 2h) et laisser le reste du créneau à quelqu'un/quelque chose
 * d'autre — "profitable pour tous" plutôt qu'un simple blocage.
 */
export async function suggestReducedSlotForDay(
  userId: string,
  durationMinutes: number,
  day: Date
): Promise<{ dateDebut: Date; dateFin: Date; dureeMinutes: number; reduced: boolean } | null> {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const slot = await suggestNextAvailableSlot(userId, durationMinutes, dayStart, 0);
  if (slot) {
    return { dateDebut: slot.dateDebut, dateFin: slot.dateFin, dureeMinutes: durationMinutes, reduced: false };
  }

  const freeWindows = await listFreeWindowsForDay(userId, dayStart);
  const largest = freeWindows.reduce<WorkWindow | null>((best, w) => {
    if (w.endMin - w.startMin < MIN_REDUCED_SLOT_MINUTES) return best;
    return !best || w.endMin - w.startMin > best.endMin - best.startMin ? w : best;
  }, null);
  if (!largest) return null;

  return {
    dateDebut: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 0, largest.startMin),
    dateFin: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 0, largest.endMin),
    dureeMinutes: largest.endMin - largest.startMin,
    reduced: true,
  };
}

/** Indisponible/Réservé servent justement à marquer une indisponibilité,
 * parfois volontairement hors des horaires de travail configurés — seuls
 * les autres types (Tâche, Réunion, Mission, etc.) doivent s'y conformer. */
const WORK_HOURS_EXEMPT_TYPES = new Set(["INDISPONIBLE", "RESERVE"]);

/**
 * Demande utilisateur — toute création/modification d'une entrée de
 * planning personnel (hors Indisponible/Réservé, voir WORK_HOURS_EXEMPT_TYPES)
 * doit rester dans les horaires de travail réellement configurés
 * (UserWorkSchedule/exceptions) ce jour-là. Ne s'applique qu'aux entrées sur
 * une seule journée — une Mission qui s'étale sur plusieurs jours n'a pas de
 * fenêtre horaire journalière à respecter.
 */
export async function assertWithinWorkHours(userId: string, type: string, dateDebut: Date, dateFin: Date): Promise<void> {
  if (WORK_HOURS_EXEMPT_TYPES.has(type)) return;
  if (dateKeyOf(dateDebut) !== dateKeyOf(dateFin)) return;

  const dayStart = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate());
  const dayEnd = addDays(dayStart, 1);

  const [schedules, exception] = await Promise.all([
    prisma.userWorkSchedule.findMany({ where: { userId }, include: { breaks: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } }),
    prisma.userWorkScheduleException.findFirst({ where: { userId, date: { gte: dayStart, lt: dayEnd } } }),
  ]);

  const scheduleByWeekday = groupSchedulesByWeekday(schedules);
  const windows = exception
    ? resolveExceptionWindows(exception)
    : resolveWorkWindows(scheduleByWeekday.get(dateDebut.getDay()) ?? null);

  const startMin = dateDebut.getHours() * 60 + dateDebut.getMinutes();
  const endMin = dateFin.getHours() * 60 + dateFin.getMinutes();
  const fits = windows.some((w) => startMin >= w.startMin && endMin <= w.endMin);
  if (!fits) {
    throw new Error("Ce créneau est en dehors de vos horaires de travail configurés — ajustez-le pour rester dans vos heures de travail.");
  }
}
