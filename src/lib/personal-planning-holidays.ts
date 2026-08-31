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

/**
 * §41 — "blocage des périodes" : avertissement (jamais bloquant) si une date
 * tombe pendant un congé déjà approuvé de l'utilisateur.
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
 * §39 — contrairement à findHolidayOnDate/findApprovedLeaveOnDate (avertissements),
 * ceci BLOQUE réellement : jour férié de l'entité, ou date marquée ABSENCE
 * via une dérogation ponctuelle (§39bis, UserWorkScheduleException), ou jour
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
