"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createRaciAssignmentSchema,
  deleteRaciAssignmentSchema,
  type CreateRaciAssignmentInput,
  type DeleteRaciAssignmentInput,
} from "@/lib/validations/raci.schema";

export async function createRaciAssignment(input: CreateRaciAssignmentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createRaciAssignmentSchema.parse(input);

  const { assignment, projectId } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const section = await tx.projectSection.findUniqueOrThrow({ where: { id: data.sectionId } });
    const created = await tx.raciAssignment.create({
      data: {
        sectionId: data.sectionId,
        userId: data.userId,
        role: data.role,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    });
    return { assignment: created, projectId: section.projectId };
  });

  await logAudit({
    userId: session.user.id,
    action: "raci_assignment.created",
    entityType: "RaciAssignment",
    entityId: assignment.id,
    changes: { sectionId: data.sectionId, userId: data.userId, role: data.role },
  });

  revalidatePath(`/projets/${projectId}`);
  return assignment;
}

export async function deleteRaciAssignment(input: DeleteRaciAssignmentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteRaciAssignmentSchema.parse(input);

  const result = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const assignment = await tx.raciAssignment.delete({
      where: { id: data.assignmentId },
      include: { section: { select: { projectId: true } } },
    });
    return assignment;
  });

  await logAudit({
    userId: session.user.id,
    action: "raci_assignment.deleted",
    entityType: "RaciAssignment",
    entityId: result.id,
    changes: {},
  });

  revalidatePath(`/projets/${result.section.projectId}`);
  return result;
}
