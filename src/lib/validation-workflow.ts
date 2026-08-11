import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import type { RoleKey } from "@/generated/prisma/enums";

/** Circuit actif pour les tâches (un seul actif à la fois dans ce MVP). */
export async function getActiveTaskWorkflow() {
  return prisma.validationWorkflow.findFirst({
    where: { entityType: "TASK", isActive: true },
    orderBy: { createdAt: "desc" },
    include: { steps: { orderBy: { ordre: "asc" } } },
  });
}

async function notifyApproversForStep(params: {
  approverRole: RoleKey;
  taskId: string;
  taskTitre: string;
}) {
  const approvers = await prisma.user.findMany({
    where: { role: { key: params.approverRole }, isActive: true },
    select: { id: true },
  });
  await Promise.all(
    approvers.map((a) =>
      createNotification({
        userId: a.id,
        type: "VALIDATION",
        titre: `Tâche à valider : ${params.taskTitre}`,
        lien: `/taches/${params.taskId}`,
        entityType: "Task",
        entityId: params.taskId,
      })
    )
  );
}

/**
 * Démarre une instance de circuit de validation pour une tâche (cahier des
 * charges §9). Crée une ligne TaskApproval EN_ATTENTE par étape, puis
 * notifie l'approbateur (par rôle) de la première étape.
 */
export async function startValidationRun(params: {
  taskId: string;
  taskTitre: string;
  submittedById: string;
}) {
  const workflow = await getActiveTaskWorkflow();
  if (!workflow || workflow.steps.length === 0) {
    throw new Error(
      "Aucun circuit de validation n'est configuré. Un administrateur doit en créer un dans Administration > Circuits de validation."
    );
  }

  const run = await prisma.taskValidationRun.create({
    data: {
      taskId: params.taskId,
      workflowId: workflow.id,
      submittedById: params.submittedById,
      currentOrdre: workflow.steps[0].ordre,
      approvals: {
        create: workflow.steps.map((step) => ({ stepId: step.id })),
      },
    },
  });

  await logAudit({
    userId: params.submittedById,
    action: "task.validation_submitted",
    entityType: "Task",
    entityId: params.taskId,
    changes: { workflowId: workflow.id, workflowNom: workflow.nom, steps: workflow.steps.length },
  });

  await notifyApproversForStep({
    approverRole: workflow.steps[0].approverRole,
    taskId: params.taskId,
    taskTitre: params.taskTitre,
  });

  return run;
}

type DecisionResult = { finalStatus: "APPROUVE" | "REJETE" | "EN_COURS" };

/**
 * Décide l'étape courante du circuit pour une tâche. Le rôle de
 * l'utilisateur doit correspondre à l'approbateur attendu à cette étape —
 * routage réel, pas n'importe quel titulaire de task.validate (cahier des
 * charges §9). Historise (AuditLog) et notifie à chaque transition.
 */
export async function decideCurrentStep(params: {
  taskId: string;
  approverId: string;
  approverRoleKey: string;
  approved: boolean;
  commentaire?: string;
}): Promise<DecisionResult> {
  const run = await prisma.taskValidationRun.findUnique({
    where: { taskId: params.taskId },
    include: {
      workflow: { include: { steps: { orderBy: { ordre: "asc" } } } },
      approvals: true,
    },
  });

  if (!run || run.statut !== "EN_COURS") {
    throw new Error("Cette tâche n'est pas en attente de validation.");
  }

  const currentStep = run.workflow.steps.find((s) => s.ordre === run.currentOrdre);
  const approval = currentStep && run.approvals.find((a) => a.stepId === currentStep.id);
  if (!currentStep || !approval) {
    throw new Error("Étape de validation introuvable.");
  }
  if (currentStep.approverRole !== params.approverRoleKey) {
    throw new Error("Vous n'êtes pas l'approbateur attendu à cette étape du circuit.");
  }

  await prisma.taskApproval.update({
    where: { id: approval.id },
    data: {
      statut: params.approved ? "APPROUVE" : "REJETE",
      approverId: params.approverId,
      commentaire: params.commentaire,
      decidedAt: new Date(),
    },
  });

  await logAudit({
    userId: params.approverId,
    action: params.approved ? "task.validation_step_approved" : "task.validation_step_rejected",
    entityType: "Task",
    entityId: params.taskId,
    changes: { stepOrdre: currentStep.ordre, approverRole: currentStep.approverRole, commentaire: params.commentaire },
  });

  if (!params.approved) {
    await prisma.taskValidationRun.update({ where: { id: run.id }, data: { statut: "REJETE" } });
    return { finalStatus: "REJETE" };
  }

  const nextStep = run.workflow.steps.find((s) => s.ordre > currentStep.ordre);

  if (!nextStep) {
    await prisma.taskValidationRun.update({ where: { id: run.id }, data: { statut: "APPROUVE" } });
    return { finalStatus: "APPROUVE" };
  }

  await prisma.taskValidationRun.update({
    where: { id: run.id },
    data: { currentOrdre: nextStep.ordre },
  });

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: params.taskId },
    select: { titre: true },
  });
  await notifyApproversForStep({
    approverRole: nextStep.approverRole,
    taskId: params.taskId,
    taskTitre: task.titre,
  });

  return { finalStatus: "EN_COURS" };
}
