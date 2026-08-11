"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user.schema";

export async function createUser(input: CreateUserInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  const data = createUserSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      roleId: data.roleId,
      departmentId: data.departmentId || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    changes: { email: user.email, roleId: data.roleId },
  });

  revalidatePath("/administration/utilisateurs");
  return user;
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });

  await logAudit({
    userId: session.user.id,
    action: isActive ? "user.activated" : "user.deactivated",
    entityType: "User",
    entityId: user.id,
  });

  revalidatePath("/administration/utilisateurs");
  return user;
}
