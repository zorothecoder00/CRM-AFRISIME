"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
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

  revalidatePath("/administration/utilisateurs");
  return user;
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/administration/utilisateurs");
  return user;
}
