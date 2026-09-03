import { prisma } from "@/lib/prisma";

export type PersonalPlanningAccessReason = "self" | "manager" | "chef_equipe" | "partage";

/**
 * §46 — "Manager : voir le planning de son équipe selon ses droits" : accès
 * détaillé (pas seulement occupé/libre, contrairement à la règle entre
 * pairs) réservé au manager hiérarchique direct (`User.managerId`), au chef
 * d'une `Team` dont la cible est membre, ou à un bénéficiaire d'un partage
 * explicite (`PersonalPlanningShare`, demande utilisateur — ex. partager son
 * agenda avec une secrétaire, sans lien hiérarchique). Toujours vrai pour
 * soi-même. Retourne la raison exacte (utile pour le message affiché),
 * `null` si aucun accès.
 */
export async function resolvePersonalPlanningAccess(
  sessionUserId: string,
  targetUserId: string
): Promise<PersonalPlanningAccessReason | null> {
  if (sessionUserId === targetUserId) return "self";

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      managerId: true,
      teamMemberships: { select: { team: { select: { leaderId: true } } } },
    },
  });
  if (!target) return null;
  if (target.managerId === sessionUserId) return "manager";
  if (target.teamMemberships.some((m) => m.team.leaderId === sessionUserId)) return "chef_equipe";

  const share = await prisma.personalPlanningShare.findUnique({
    where: { ownerId_granteeId: { ownerId: targetUserId, granteeId: sessionUserId } },
  });
  if (share) return "partage";

  return null;
}

export async function canViewPersonalPlanningOf(sessionUserId: string, targetUserId: string): Promise<boolean> {
  return (await resolvePersonalPlanningAccess(sessionUserId, targetUserId)) !== null;
}
