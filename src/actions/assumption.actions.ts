"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createAssumptionSchema,
  updateAssumptionStatusSchema,
  deleteAssumptionSchema,
  type CreateAssumptionInput,
  type UpdateAssumptionStatusInput,
  type DeleteAssumptionInput,
} from "@/lib/validations/assumption.schema";

/** Registre des hypotheses (Project Studio §29) — distinct du registre des risques. */
export async function createAssumption(input: CreateAssumptionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createAssumptionSchema.parse(input);

  const assumption = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectAssumption.create({
      data: {
        projectId: data.projectId,
        hypothese: data.hypothese,
        statut: data.statut,
        notes: data.notes,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "assumption.created",
    entityType: "ProjectAssumption",
    entityId: assumption.id,
    changes: { hypothese: assumption.hypothese },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return assumption;
}

export async function updateAssumptionStatus(input: UpdateAssumptionStatusInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateAssumptionStatusSchema.parse(input);

  const assumption = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectAssumption.update({
      where: { id: data.assumptionId },
      data: { statut: data.statut },
    })
  );

  revalidatePath(`/projets/${assumption.projectId}`);
  return assumption;
}

export async function deleteAssumption(input: DeleteAssumptionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteAssumptionSchema.parse(input);

  const assumption = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectAssumption.delete({ where: { id: data.assumptionId } })
  );

  revalidatePath(`/projets/${assumption.projectId}`);
  return assumption;
}
