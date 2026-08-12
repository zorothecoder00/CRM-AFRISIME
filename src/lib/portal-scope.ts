import type { Prisma } from "@/generated/prisma/client";

/**
 * Rôles "externes" (cahier des charges §II) : ont un compte et se
 * connectent normalement, mais ne doivent voir que les projets/tâches
 * auxquels ils sont réellement rattachés — pas l'ensemble de l'organisation
 * comme le personnel interne.
 */
const EXTERNAL_ROLES = new Set(["CONSULTANT_EXTERNE", "PRESTATAIRE", "INVITE"]);

export function isExternalRole(roleKey: string): boolean {
  return EXTERNAL_ROLES.has(roleKey);
}

/** Restreint la liste des projets aux seuls projets dont l'utilisateur est membre, pour les rôles externes. */
export function projectVisibilityWhere(
  roleKey: string,
  userId: string
): Prisma.ProjectWhereInput | undefined {
  if (!isExternalRole(roleKey)) return undefined;
  return { members: { some: { userId } } };
}

/** Idem pour les tâches : responsable principal, assigné, ou membre du projet parent. */
export function taskVisibilityWhere(roleKey: string, userId: string): Prisma.TaskWhereInput | undefined {
  if (!isExternalRole(roleKey)) return undefined;
  return {
    OR: [
      { responsablePrincipalId: userId },
      { assignees: { some: { userId } } },
      { project: { members: { some: { userId } } } },
    ],
  };
}
