"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/validations/user.schema";

/** Un manager ne peut pas etre son propre subordonne, direct ou indirect (meme principe que assertNoCycle pour Department/Objective/Plan). */
async function assertNoManagerCycle(userId: string, managerId: string) {
  if (managerId === userId) {
    throw new Error("Un collaborateur ne peut pas être son propre manager.");
  }
  let currentId: string | null = managerId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === userId) {
      throw new Error("Ce rattachement créerait une boucle dans la hiérarchie.");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });
    currentId = current?.managerId ?? null;
  }
}

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
      poste: data.poste || undefined,
      posteId: data.posteId || undefined,
      siteId: data.siteId || undefined,
      managerId: data.managerId || undefined,
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

export async function updateUser(input: UpdateUserInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  const data = updateUserSchema.parse(input);

  if (data.managerId) {
    await assertNoManagerCycle(data.id, data.managerId);
  }

  const user = await prisma.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email,
      roleId: data.roleId,
      departmentId: data.departmentId || null,
      poste: data.poste || null,
      posteId: data.posteId || null,
      siteId: data.siteId || null,
      managerId: data.managerId || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "user.updated",
    entityType: "User",
    entityId: user.id,
    changes: { name: user.name, roleId: data.roleId, managerId: data.managerId ?? null },
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
