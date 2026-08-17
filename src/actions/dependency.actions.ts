"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createDependencySchema, type CreateDependencyInput } from "@/lib/validations/dependency.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createDependency(input: CreateDependencyInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createDependencySchema.parse(input);

  const dependency = await prisma.dependency.create({
    data: {
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      targetType: data.targetType,
      targetId: data.targetId,
      type: data.type,
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "dependency.created",
    entityType: "Dependency",
    entityId: dependency.id,
    changes: { sourceType: data.sourceType, sourceId: data.sourceId, targetType: data.targetType, targetId: data.targetId },
  });

  revalidatePath("/dependances");
  if (data.sourceType === "Project") revalidatePath(`/projets/${data.sourceId}`);
  return dependency;
}

export async function deleteDependency(dependencyId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const dependency = await prisma.dependency.delete({ where: { id: dependencyId } });

  await logAudit({
    userId: session.user.id,
    action: "dependency.deleted",
    entityType: "Dependency",
    entityId: dependency.id,
  });

  revalidatePath("/dependances");
  if (dependency.sourceType === "Project") revalidatePath(`/projets/${dependency.sourceId}`);
  return dependency;
}
