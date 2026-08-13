"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createPermissionOverrideSchema,
  type CreatePermissionOverrideInput,
} from "@/lib/validations/permission-override.schema";

/**
 * Derogations de permission (cahier des charges §19 : droits « par rôle,
 * département, projet ou équipe »). Complete la matrice par rôle
 * (role.actions.ts) avec des exceptions ciblees par utilisateur + portee.
 */
export async function createPermissionOverride(input: CreatePermissionOverrideInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_ROLES_MANAGE);

  const data = createPermissionOverrideSchema.parse(input);

  const override = await prisma.permissionOverride.create({
    data: {
      userId: data.userId,
      permissionKey: data.permissionKey,
      departmentId: data.scopeType === "DEPARTEMENT" ? data.scopeId : undefined,
      projectId: data.scopeType === "PROJET" ? data.scopeId : undefined,
      effect: data.effect,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "permission_override.created",
    entityType: "PermissionOverride",
    entityId: override.id,
    changes: {
      targetUserId: data.userId,
      permissionKey: data.permissionKey,
      effect: data.effect,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
    },
  });

  revalidatePath("/administration/acces-avances");
  return override;
}

export async function deletePermissionOverride(overrideId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_ROLES_MANAGE);

  const override = await prisma.permissionOverride.delete({ where: { id: overrideId } });

  await logAudit({
    userId: session.user.id,
    action: "permission_override.deleted",
    entityType: "PermissionOverride",
    entityId: overrideId,
    changes: { targetUserId: override.userId, permissionKey: override.permissionKey },
  });

  revalidatePath("/administration/acces-avances");
}
