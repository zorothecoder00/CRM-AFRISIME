"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from "@/lib/validations/department.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Un departement ne peut pas devenir son propre ancetre (remonte la chaine parentId). */
async function assertNoCycle(departmentId: string, parentId: string) {
  if (parentId === departmentId) {
    throw new Error("Un département ne peut pas être son propre parent.");
  }
  let currentId: string | null = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === departmentId) {
      throw new Error("Ce rattachement créerait une boucle dans la hiérarchie.");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { parentId: string | null } | null = await prisma.department.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

export async function createDepartment(input: CreateDepartmentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = createDepartmentSchema.parse(input);

  const department = await prisma.department.create({
    data: {
      name: data.name,
      code: data.code,
      parentId: data.parentId || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "department.created",
    entityType: "Department",
    entityId: department.id,
    changes: { name: department.name, parentId: department.parentId },
  });

  revalidatePath("/administration/departements");
  return department;
}

export async function updateDepartment(input: UpdateDepartmentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = updateDepartmentSchema.parse(input);

  if (data.parentId) {
    await assertNoCycle(data.id, data.parentId);
  }

  const department = await prisma.department.update({
    where: { id: data.id },
    data: {
      name: data.name,
      code: data.code,
      parentId: data.parentId || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "department.updated",
    entityType: "Department",
    entityId: department.id,
    changes: { name: department.name, parentId: department.parentId },
  });

  revalidatePath("/administration/departements");
  return department;
}
