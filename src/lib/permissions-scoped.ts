import { prisma } from "@/lib/prisma";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

/**
 * Portée département/projet/équipe (cahier des charges §19 : droits
 * définissables « par rôle, département, projet ou équipe »). N'interroge la
 * base que si un scope est fourni. Séparé de permissions.ts (qui reste
 * importable sans risque depuis un composant client) car ce fichier touche
 * prisma — et donc `pg`, qui casse le bundle navigateur
 * (require("net")/("tls")) s'il se retrouve importé, même via un import
 * différé, depuis un composant client.
 * Une dérogation DENY l'emporte toujours ; une dérogation GRANT complète un
 * rôle qui n'accorde pas le droit nativement.
 */
export async function hasScopedPermission(
  permissions: string[] | undefined,
  key: PermissionKey,
  userId: string,
  scope?: { departmentId?: string; projectId?: string; teamId?: string }
): Promise<boolean> {
  const roleGrants = hasPermission(permissions, key);
  if (!scope?.departmentId && !scope?.projectId && !scope?.teamId) {
    return roleGrants;
  }

  const overrides = await prisma.permissionOverride.findMany({
    where: {
      userId,
      permissionKey: key,
      OR: [
        scope.departmentId ? { departmentId: scope.departmentId } : undefined,
        scope.projectId ? { projectId: scope.projectId } : undefined,
        scope.teamId ? { teamId: scope.teamId } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
    },
  });

  if (overrides.some((o) => o.effect === "DENY")) return false;
  if (overrides.some((o) => o.effect === "GRANT")) return true;
  return roleGrants;
}

export async function requireScopedPermission(
  permissions: string[] | undefined,
  key: PermissionKey,
  userId: string,
  scope?: { departmentId?: string; projectId?: string; teamId?: string }
): Promise<void> {
  const allowed = await hasScopedPermission(permissions, key, userId, scope);
  if (!allowed) {
    throw new Error(`Permission refusée: ${key}`);
  }
}
