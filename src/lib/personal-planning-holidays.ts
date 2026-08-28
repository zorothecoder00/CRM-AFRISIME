import { prisma } from "@/lib/prisma";
import { getDepartmentEntityId } from "@/lib/entity-scope";

/**
 * Module "Planning personnel" §39 — avertissement (jamais bloquant, cohérent
 * avec le reste du module) si une date tombe un jour férié de l'entité de
 * l'utilisateur. `recurrenceAnnuelle` compare seulement jour+mois, sinon la
 * date exacte.
 */
export async function findHolidayOnDate(userId: string, date: Date): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
  if (!user?.departmentId) return null;

  const allDepartments = await prisma.department.findMany({ select: { id: true, parentId: true, entityId: true } });
  const entityId = getDepartmentEntityId(user.departmentId, allDepartments);
  if (!entityId) return null;

  const holidays = await prisma.holiday.findMany({ where: { entityId }, select: { nom: true, date: true, recurrenceAnnuelle: true } });
  const match = holidays.find((h) =>
    h.recurrenceAnnuelle
      ? h.date.getMonth() === date.getMonth() && h.date.getDate() === date.getDate()
      : h.date.getFullYear() === date.getFullYear() && h.date.getMonth() === date.getMonth() && h.date.getDate() === date.getDate()
  );
  return match?.nom ?? null;
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
