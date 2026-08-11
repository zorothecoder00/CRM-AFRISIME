"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createValidationWorkflowSchema,
  type CreateValidationWorkflowInput,
} from "@/lib/validations/validation-workflow.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Un seul circuit actif à la fois pour les tâches : créer un nouveau désactive l'ancien. */
export async function createValidationWorkflow(input: CreateValidationWorkflowInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.WORKFLOW_MANAGE);

  const data = createValidationWorkflowSchema.parse(input);

  const workflow = await prisma.$transaction(async (tx) => {
    await tx.validationWorkflow.updateMany({
      where: { entityType: "TASK", isActive: true },
      data: { isActive: false },
    });

    return tx.validationWorkflow.create({
      data: {
        nom: data.nom,
        entityType: "TASK",
        createdById: session.user.id,
        steps: {
          create: data.steps.map((step, index) => ({
            ordre: index + 1,
            approverRole: step.approverRole,
            label: step.label,
          })),
        },
      },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "validation_workflow.created",
    entityType: "ValidationWorkflow",
    entityId: workflow.id,
    changes: { nom: workflow.nom, steps: data.steps.length },
  });

  revalidatePath("/administration/workflows");
  return workflow;
}

export async function toggleValidationWorkflowActive(workflowId: string, isActive: boolean) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.WORKFLOW_MANAGE);

  const workflow = await prisma.validationWorkflow.update({
    where: { id: workflowId },
    data: { isActive },
  });

  await logAudit({
    userId: session.user.id,
    action: isActive ? "validation_workflow.activated" : "validation_workflow.deactivated",
    entityType: "ValidationWorkflow",
    entityId: workflow.id,
  });

  revalidatePath("/administration/workflows");
  return workflow;
}
