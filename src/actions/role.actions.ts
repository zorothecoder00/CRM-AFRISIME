"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission, type PermissionKey } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

/**
 * Bascule une permission pour un rôle (cahier des charges §3/§19 : « droits
 * personnalisables »). SUPER_ADMIN est verrouillé pour ne jamais pouvoir se
 * retirer l'accès administration par erreur.
 */
export async function toggleRolePermission(roleId: string, permissionKey: PermissionKey, enabled: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_ROLES_MANAGE);

  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  if (role.key === "SUPER_ADMIN") {
    throw new Error("Les permissions du Super Administrateur ne peuvent pas être modifiées.");
  }

  const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });

  if (enabled) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      update: {},
      create: { roleId, permissionId: permission.id },
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId: permission.id } });
  }

  await logAudit({
    userId: session.user.id,
    action: enabled ? "role.permission_granted" : "role.permission_revoked",
    entityType: "Role",
    entityId: roleId,
    changes: { permissionKey },
  });

  revalidatePath("/administration/roles");
}
