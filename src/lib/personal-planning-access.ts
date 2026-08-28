import { prisma } from "@/lib/prisma";

/**
 * §46 — "Manager : voir le planning de son équipe selon ses droits" : accès
 * détaillé (pas seulement occupé/libre, contrairement à la règle entre
 * pairs) réservé au manager hiérarchique direct (`User.managerId`) ou au
 * chef d'une `Team` dont la cible est membre. Toujours vrai pour soi-même.
 */
export async function canViewPersonalPlanningOf(sessionUserId: string, targetUserId: string): Promise<boolean> {
  if (sessionUserId === targetUserId) return true;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      managerId: true,
      teamMemberships: { select: { team: { select: { leaderId: true } } } },
    },
  });
  if (!target) return false;
  if (target.managerId === sessionUserId) return true;

  return target.teamMemberships.some((m) => m.team.leaderId === sessionUserId);
}
