import { prisma } from "@/lib/prisma";
import { getDepartmentEntityId } from "@/lib/entity-scope";
import { dateKeyOf } from "@/lib/personal-planning-grid";

type HolidayLite = { nom: string; date: Date; recurrenceAnnuelle: boolean };

async function getEntityHolidays(userId: string): Promise<HolidayLite[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
  if (!user?.departmentId) return [];

  const allDepartments = await prisma.department.findMany({ select: { id: true, parentId: true, entityId: true } });
  const entityId = getDepartmentEntityId(user.departmentId, allDepartments);
  if (!entityId) return [];

  return prisma.holiday.findMany({ where: { entityId }, select: { nom: true, date: true, recurrenceAnnuelle: true } });
}

function matchHoliday(holidays: HolidayLite[], date: Date): string | null {
  const match = holidays.find((h) =>
    h.recurrenceAnnuelle
      ? h.date.getMonth() === date.getMonth() && h.date.getDate() === date.getDate()
      : h.date.getFullYear() === date.getFullYear() && h.date.getMonth() === date.getMonth() && h.date.getDate() === date.getDate()
  );
  return match?.nom ?? null;
}

/**
 * Module "Planning personnel" §39 — avertissement (jamais bloquant, cohérent
 * avec le reste du module) si une date tombe un jour férié de l'entité de
 * l'utilisateur. `recurrenceAnnuelle` compare seulement jour+mois, sinon la
 * date exacte.
 */
export async function findHolidayOnDate(userId: string, date: Date): Promise<string | null> {
  const holidays = await getEntityHolidays(userId);
  return matchHoliday(holidays, date);
}

/**
 * §39 — variante par lot pour les vues Semaine/Jour/Mois : un seul aller-retour
 * base de données pour marquer visuellement chaque jour férié de la plage
 * affichée, plutôt que d'appeler findHolidayOnDate une fois par jour.
 */
export async function findHolidaysInRange(userId: string, rangeStart: Date, rangeEnd: Date): Promise<Map<string, string>> {
  const holidays = await getEntityHolidays(userId);
  const result = new Map<string, string>();
  if (holidays.length === 0) return result;

  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
  while (cursor <= end) {
    const nom = matchHoliday(holidays, cursor);
    if (nom) result.set(dateKeyOf(cursor), nom);
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export type NonWorkingReason = { label: string; kind: "ferie" | "conge" | "absence" | "non_ouvrable" };

const LEAVE_TYPE_LABELS: Record<string, string> = { CONGE_PAYE: "congé payé", MALADIE: "maladie", AUTRE: "congé" };

/**
 * §41 — variante par lot des congés APPROUVE d'un utilisateur qui recoupent
 * la plage [rangeStart, rangeEnd], pour marquer chaque jour concerné en une
 * seule requête (voir findApprovedLeaveOnDate pour la version un-seul-jour).
 */
async function findApprovedLeavesInRange(userId: string, rangeStart: Date, rangeEnd: Date) {
  return prisma.leave.findMany({
    where: { userId, statut: "APPROUVE", dateDebut: { lte: rangeEnd }, dateFin: { gte: rangeStart } },
    select: { type: true, dateDebut: true, dateFin: true },
  });
}

/**
 * §39/§41 — variante par lot, pour l'affichage (badge/bandeau visuel sur les
 * vues Semaine/Jour/Mois), des QUATRE raisons qui font qu'un jour est "non
 * travaillé" côté validation (voir assertNotOnNonWorkingDay, mêmes règles
 * de priorité : férié > congé approuvé > dérogation ponctuelle > gabarit
 * hebdomadaire) — les deux doivent rester alignées si l'une des règles change.
 */
export async function findNonWorkingDaysInRange(userId: string, rangeStart: Date, rangeEnd: Date): Promise<Map<string, NonWorkingReason>> {
  const dayStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const dayEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

  const [holidaysMap, leaves, exceptions, scheduleRows] = await Promise.all([
    findHolidaysInRange(userId, rangeStart, rangeEnd),
    findApprovedLeavesInRange(userId, dayStart, dayEnd),
    prisma.userWorkScheduleException.findMany({
      where: { userId, date: { gte: dayStart, lte: dayEnd } },
      select: { date: true, type: true, motif: true },
    }),
    prisma.userWorkSchedule.findMany({ where: { userId }, select: { jourSemaine: true } }),
  ]);

  const result = new Map<string, NonWorkingReason>();
  for (const [key, nom] of holidaysMap) {
    result.set(key, { label: `Jour férié : ${nom}`, kind: "ferie" });
  }

  if (leaves.length > 0) {
    const cursorLeave = new Date(dayStart);
    while (cursorLeave <= dayEnd) {
      const key = dateKeyOf(cursorLeave);
      if (!result.has(key)) {
        const leave = leaves.find((l) => l.dateDebut <= cursorLeave && l.dateFin >= cursorLeave);
        if (leave) result.set(key, { label: `Congé approuvé (${LEAVE_TYPE_LABELS[leave.type] ?? leave.type})`, kind: "conge" });
      }
      cursorLeave.setDate(cursorLeave.getDate() + 1);
    }
  }

  const exceptionByKey = new Map(exceptions.map((e) => [dateKeyOf(e.date), e]));
  const activeDays = new Set(scheduleRows.map((s) => s.jourSemaine));
  const hasScheduleConfigured = scheduleRows.length > 0;

  const cursor = new Date(dayStart);
  while (cursor <= dayEnd) {
    const key = dateKeyOf(cursor);
    if (!result.has(key)) {
      const exception = exceptionByKey.get(key);
      if (exception) {
        if (exception.type === "ABSENCE") {
          result.set(key, { label: exception.motif ? `Absence — ${exception.motif}` : "Absence", kind: "absence" });
        }
        // dérogation non-ABSENCE = jour explicitement travaillé, rien à marquer.
      } else if (hasScheduleConfigured && !activeDays.has(cursor.getDay())) {
        result.set(key, { label: "Jour non ouvrable", kind: "non_ouvrable" });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * §41 — congé déjà APPROUVE de l'utilisateur sur cette date, s'il y en a un.
 * Pour les types bloqués (voir BLOCKED_ON_NON_WORKING_DAY), assertNotOnNonWorkingDay
 * l'utilise pour un vrai blocage ("blocage des périodes") ; pour les autres
 * types (Mission, Déplacement, ...), collectPlanningWarnings s'en sert pour
 * un simple avertissement non bloquant.
 */
export async function findApprovedLeaveOnDate(userId: string, date: Date): Promise<string | null> {
  const leave = await prisma.leave.findFirst({
    where: { userId, statut: "APPROUVE", dateDebut: { lte: date }, dateFin: { gte: date } },
    select: { type: true },
  });
  return leave ? `congé (${leave.type})` : null;
}

/**
 * §39 — types d'activité correspondant à un vrai engagement de travail :
 * seuls ceux-là sont bloqués un jour férié/non ouvré. Mission/Déplacement/
 * Événement/Note/Pause/Indisponible restent volontairement libres (un
 * déplacement démarre parfois un jour férié, une note personnelle n'a pas
 * à respecter les jours ouvrables).
 */
const BLOCKED_ON_NON_WORKING_DAY = new Set(["TACHE", "REUNION", "RENDEZ_VOUS", "APPEL", "FORMATION", "TRAVAIL_PERSONNEL"]);

/**
 * §39/§41 — contrairement à findHolidayOnDate/findApprovedLeaveOnDate (avertissements
 * pour les types non listés ici), ceci BLOQUE réellement : jour férié de l'entité,
 * congé déjà APPROUVE de l'utilisateur ("blocage des périodes", §41), date marquée
 * ABSENCE via une dérogation ponctuelle (§39bis, UserWorkScheduleException), ou jour
 * de semaine explicitement retiré du gabarit hebdomadaire (§40) — uniquement
 * si l'utilisateur a déjà configuré au moins un jour, pour ne jamais bloquer
 * silencieusement quelqu'un qui n'a encore rien paramétré.
 */
export async function assertNotOnNonWorkingDay(userId: string, date: Date, entryType: string): Promise<void> {
  if (!BLOCKED_ON_NON_WORKING_DAY.has(entryType)) return;

  const holidayName = await findHolidayOnDate(userId, date);
  if (holidayName) {
    throw new Error(
      `Impossible de planifier ce type d'activité un jour férié (${holidayName}). Changez de date, ou utilisez un type Mission/Déplacement/Événement si c'est volontaire.`
    );
  }

  const leave = await findApprovedLeaveOnDate(userId, date);
  if (leave) {
    throw new Error(
      `Impossible de planifier ce type d'activité : vous êtes en ${leave} à cette date. Changez de date, ou utilisez un type Mission/Déplacement/Événement si c'est volontaire.`
    );
  }

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const exception = await prisma.userWorkScheduleException.findUnique({
    where: { userId_date: { userId, date: dayStart } },
  });
  if (exception) {
    if (exception.type === "ABSENCE") {
      throw new Error(
        `Impossible de planifier ce type d'activité : vous avez marqué le ${dayStart.toLocaleDateString("fr-FR")} comme non travaillé${exception.motif ? ` (${exception.motif})` : ""}.`
      );
    }
    return; // dérogation non-ABSENCE = jour explicitement travaillé ce jour-là, pas de blocage hebdomadaire à vérifier.
  }

  const scheduleCount = await prisma.userWorkSchedule.count({ where: { userId } });
  if (scheduleCount === 0) return; // aucun horaire configuré : pas d'hypothèse de jour non ouvré.

  const activeDay = await prisma.userWorkSchedule.findUnique({
    where: { userId_jourSemaine: { userId, jourSemaine: date.getDay() } },
  });
  if (!activeDay) {
    throw new Error("Impossible de planifier ce type d'activité : ce jour ne fait pas partie de vos jours ouvrables (voir Horaires de travail).");
  }
}
