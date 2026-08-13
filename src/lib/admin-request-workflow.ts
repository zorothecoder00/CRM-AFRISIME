import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import type { RoleKey, AdminRequestType } from "@/generated/prisma/enums";

/**
 * Miroir exact de src/lib/validation-workflow.ts, pour les demandes
 * administratives plutot que les taches — modeles distincts
 * (AdminRequestValidationRun/AdminRequestApproval) mais meme logique de
 * progression d'etape, pour ne pas risquer de regression sur le circuit des
 * taches deja en production.
 */

/**
 * Choisit le circuit actif le plus specifique pour une demande donnee
 * (cahier des charges §VIII, "Condition") : un circuit dont
 * adminRequestType correspond exactement passe avant un circuit generique
 * (adminRequestType nul), et parmi les circuits dont le montantMin est
 * satisfait, celui avec le montantMin le plus eleve est le plus specifique.
 */
export async function getActiveAdminRequestWorkflow(type?: AdminRequestType, montant?: number | null) {
  const candidates = await prisma.validationWorkflow.findMany({
    where: { entityType: "ADMIN_REQUEST", isActive: true },
    include: { steps: { orderBy: { ordre: "asc" } } },
  });

  const eligible = candidates.filter((w) => {
    const typeOk = !w.adminRequestType || w.adminRequestType === type;
    const montantOk = w.montantMin === null || (montant !== null && montant !== undefined && montant >= Number(w.montantMin));
    return typeOk && montantOk;
  });

  eligible.sort((a, b) => {
    const typeScore = (w: (typeof eligible)[number]) => (w.adminRequestType ? 1 : 0);
    if (typeScore(b) !== typeScore(a)) return typeScore(b) - typeScore(a);
    const montantScore = (w: (typeof eligible)[number]) => (w.montantMin === null ? -1 : Number(w.montantMin));
    return montantScore(b) - montantScore(a);
  });

  return eligible[0] ?? null;
}

/**
 * Condition d'applicabilite d'une etape (cahier des charges §VIII,
 * "Condition") : null/null = toujours applicable (comportement historique,
 * garanti pour tous les circuits existants qui ne renseignent pas ces
 * champs). Si une borne est definie mais que la demande n'a pas de montant,
 * l'etape est consideree non applicable plutot que de bloquer le circuit.
 */
function stepConditionSatisfied(
  step: { montantMin: unknown; montantMax: unknown },
  montant: number | null
): boolean {
  const min = step.montantMin !== null ? Number(step.montantMin) : null;
  const max = step.montantMax !== null ? Number(step.montantMax) : null;
  if (min === null && max === null) return true;
  if (montant === null) return false;
  if (min !== null && montant < min) return false;
  if (max !== null && montant > max) return false;
  return true;
}

async function notifyApproversForStep(params: {
  approverRole: RoleKey;
  adminRequestId: string;
  titre: string;
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
        titre: `Demande à valider : ${params.titre}`,
        lien: `/demandes/${params.adminRequestId}`,
        entityType: "AdminRequest",
        entityId: params.adminRequestId,
      })
    )
  );
}

/** Action automatique de fin de circuit (cahier des charges §VIII, ex. "Demande de mission -> ... -> Mission creee"). */
async function finalizeApprovedRun(params: {
  runId: string;
  adminRequestId: string;
  actorId: string;
  creerTacheAlApprobation: boolean;
  autoTaskProjectId: string | null;
}) {
  await prisma.adminRequestValidationRun.update({ where: { id: params.runId }, data: { statut: "APPROUVE" } });

  if (params.creerTacheAlApprobation && params.autoTaskProjectId) {
    const adminRequest = await prisma.adminRequest.findUniqueOrThrow({
      where: { id: params.adminRequestId },
      select: { titre: true, demandeurId: true },
    });
    const task = await prisma.task.create({
      data: {
        projectId: params.autoTaskProjectId,
        titre: adminRequest.titre,
        responsablePrincipalId: adminRequest.demandeurId,
        createdById: params.actorId,
        creeParWorkflow: true,
      },
    });
    await prisma.adminRequest.update({ where: { id: params.adminRequestId }, data: { taskId: task.id } });
    await logAudit({
      userId: params.actorId,
      action: "admin_request.task_auto_created",
      entityType: "Task",
      entityId: task.id,
      changes: { adminRequestId: params.adminRequestId },
    });
    await createNotification({
      userId: adminRequest.demandeurId,
      type: "NOUVELLE_TACHE",
      titre: `Mission créée : ${task.titre}`,
      lien: `/taches/${task.id}`,
      entityType: "Task",
      entityId: task.id,
    });
  }
}

/** Demarre une instance de circuit pour une demande administrative des sa creation. */
export async function startAdminRequestValidationRun(params: {
  adminRequestId: string;
  titre: string;
  submittedById: string;
  type: AdminRequestType;
  montant: number | null;
}) {
  const workflow = await getActiveAdminRequestWorkflow(params.type, params.montant);
  if (!workflow || workflow.steps.length === 0) {
    throw new Error(
      "Aucun circuit de validation n'est configuré pour les demandes administratives. Un administrateur doit en créer un dans Administration > Circuits de validation."
    );
  }

  const run = await prisma.adminRequestValidationRun.create({
    data: {
      adminRequestId: params.adminRequestId,
      workflowId: workflow.id,
      submittedById: params.submittedById,
      currentOrdre: workflow.steps[0].ordre,
      approvals: {
        create: workflow.steps.map((step) => ({ stepId: step.id })),
      },
    },
    include: { approvals: true },
  });

  await logAudit({
    userId: params.submittedById,
    action: "admin_request.validation_submitted",
    entityType: "AdminRequest",
    entityId: params.adminRequestId,
    changes: { workflowId: workflow.id, workflowNom: workflow.nom, steps: workflow.steps.length },
  });

  // Ignore automatiquement les etapes initiales dont la condition de
  // montant n'est pas remplie (cahier des charges §VIII, "Condition").
  const firstApplicable = workflow.steps.find((s) => stepConditionSatisfied(s, params.montant));
  for (const step of workflow.steps) {
    if (firstApplicable && step.ordre >= firstApplicable.ordre) break;
    const approval = run.approvals.find((a) => a.stepId === step.id);
    if (!approval) continue;
    await prisma.adminRequestApproval.update({
      where: { id: approval.id },
      data: {
        statut: "APPROUVE",
        commentaire: "Étape ignorée automatiquement — condition de montant non remplie.",
        decidedAt: new Date(),
      },
    });
    await logAudit({
      userId: params.submittedById,
      action: "admin_request.validation_step_skipped",
      entityType: "AdminRequest",
      entityId: params.adminRequestId,
      changes: { stepOrdre: step.ordre },
    });
  }

  if (!firstApplicable) {
    await finalizeApprovedRun({
      runId: run.id,
      adminRequestId: params.adminRequestId,
      actorId: params.submittedById,
      creerTacheAlApprobation: workflow.creerTacheAlApprobation,
      autoTaskProjectId: workflow.autoTaskProjectId,
    });
    return run;
  }

  await prisma.adminRequestValidationRun.update({ where: { id: run.id }, data: { currentOrdre: firstApplicable.ordre } });

  await notifyApproversForStep({
    approverRole: firstApplicable.approverRole,
    adminRequestId: params.adminRequestId,
    titre: params.titre,
  });

  return run;
}

type DecisionResult = { finalStatus: "APPROUVE" | "REJETE" | "EN_COURS" };

/** Decide l'etape courante du circuit pour une demande administrative. */
export async function decideAdminRequestCurrentStep(params: {
  adminRequestId: string;
  approverId: string;
  approverRoleKey: string;
  approved: boolean;
  commentaire?: string;
}): Promise<DecisionResult> {
  const run = await prisma.adminRequestValidationRun.findUnique({
    where: { adminRequestId: params.adminRequestId },
    include: {
      workflow: { include: { steps: { orderBy: { ordre: "asc" } } } },
      approvals: true,
    },
  });

  if (!run || run.statut !== "EN_COURS") {
    throw new Error("Cette demande n'est pas en attente de validation.");
  }

  const currentStep = run.workflow.steps.find((s) => s.ordre === run.currentOrdre);
  const approval = currentStep && run.approvals.find((a) => a.stepId === currentStep.id);
  if (!currentStep || !approval) {
    throw new Error("Étape de validation introuvable.");
  }
  if (currentStep.approverRole !== params.approverRoleKey) {
    throw new Error("Vous n'êtes pas l'approbateur attendu à cette étape du circuit.");
  }

  await prisma.adminRequestApproval.update({
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
    action: params.approved ? "admin_request.validation_step_approved" : "admin_request.validation_step_rejected",
    entityType: "AdminRequest",
    entityId: params.adminRequestId,
    changes: { stepOrdre: currentStep.ordre, approverRole: currentStep.approverRole, commentaire: params.commentaire },
  });

  if (!params.approved) {
    await prisma.adminRequestValidationRun.update({ where: { id: run.id }, data: { statut: "REJETE" } });
    return { finalStatus: "REJETE" };
  }

  const adminRequest = await prisma.adminRequest.findUniqueOrThrow({
    where: { id: params.adminRequestId },
    select: { titre: true, montant: true },
  });
  const montant = adminRequest.montant !== null ? Number(adminRequest.montant) : null;

  // Cherche la prochaine etape APPLICABLE, en ignorant automatiquement
  // celles dont la condition de montant n'est pas remplie.
  let nextStep = run.workflow.steps.find((s) => s.ordre > currentStep.ordre);
  while (nextStep && !stepConditionSatisfied(nextStep, montant)) {
    const skippedApproval = run.approvals.find((a) => a.stepId === nextStep!.id);
    if (skippedApproval) {
      await prisma.adminRequestApproval.update({
        where: { id: skippedApproval.id },
        data: {
          statut: "APPROUVE",
          commentaire: "Étape ignorée automatiquement — condition de montant non remplie.",
          decidedAt: new Date(),
        },
      });
      await logAudit({
        userId: params.approverId,
        action: "admin_request.validation_step_skipped",
        entityType: "AdminRequest",
        entityId: params.adminRequestId,
        changes: { stepOrdre: nextStep.ordre },
      });
    }
    const skippedOrdre = nextStep.ordre;
    nextStep = run.workflow.steps.find((s) => s.ordre > skippedOrdre);
  }

  if (!nextStep) {
    await finalizeApprovedRun({
      runId: run.id,
      adminRequestId: params.adminRequestId,
      actorId: params.approverId,
      creerTacheAlApprobation: run.workflow.creerTacheAlApprobation,
      autoTaskProjectId: run.workflow.autoTaskProjectId,
    });
    return { finalStatus: "APPROUVE" };
  }

  await prisma.adminRequestValidationRun.update({
    where: { id: run.id },
    data: { currentOrdre: nextStep.ordre },
  });

  await notifyApproversForStep({
    approverRole: nextStep.approverRole,
    adminRequestId: params.adminRequestId,
    titre: adminRequest.titre,
  });

  return { finalStatus: "EN_COURS" };
}
