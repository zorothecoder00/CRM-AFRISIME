import { prisma } from "@/lib/prisma";
import { createNotification, notifyMany } from "@/lib/notify";
import { TaskStatus } from "@/generated/prisma/enums";
import type { AutomationRule } from "@/generated/prisma/client";

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];

type AutomationContext = {
  entityType: string;
  entityId: string;
  label: string;
  projectId: string;
  /** Destinataire ciblé pour SEND_REMINDER (ex. responsable de la tâche/du projet). */
  targetUserId?: string;
};

/**
 * Dispatcheur générique : n'importe quel déclencheur peut être associé à
 * n'importe quelle action (cahier des charges §15). Déduplique via
 * AutomationExecution pour qu'une règle ne se déclenche qu'une fois par
 * entité déclenchante (évite le spam si la page qui déclenche l'évaluation
 * est revisitée, ex. échéance proche).
 */
async function executeAction(rule: AutomationRule, context: AutomationContext) {
  const already = await prisma.automationExecution.findFirst({
    where: { ruleId: rule.id, entityType: context.entityType, entityId: context.entityId },
  });
  if (already) return;

  switch (rule.action) {
    case "CREATE_NEXT_TASK": {
      if (!rule.nextTaskTitre || !rule.nextTaskResponsableId) {
        await logExecution(rule.id, context, "Ignorée : titre ou responsable de la tâche suivante non configuré.");
        return;
      }
      const task = await prisma.task.create({
        data: {
          projectId: context.projectId,
          titre: rule.nextTaskTitre,
          responsablePrincipalId: rule.nextTaskResponsableId,
          createdById: rule.createdById,
          echeance: rule.nextTaskDelaiJours
            ? new Date(Date.now() + rule.nextTaskDelaiJours * 24 * 60 * 60 * 1000)
            : undefined,
        },
      });
      await createNotification({
        userId: rule.nextTaskResponsableId,
        type: "NOUVELLE_TACHE",
        titre: `Nouvelle tâche assignée (automatisation « ${rule.nom} ») : ${task.titre}`,
        lien: `/taches/${task.id}`,
        entityType: "Task",
        entityId: task.id,
      });
      await logExecution(rule.id, context, `Tâche créée : « ${task.titre} ».`);
      return;
    }

    case "SEND_REMINDER": {
      if (!context.targetUserId) {
        await logExecution(rule.id, context, "Ignorée : aucun destinataire déterminé.");
        return;
      }
      await createNotification({
        userId: context.targetUserId,
        type: "RETARD",
        titre: `Rappel (automatisation « ${rule.nom} ») : ${context.label}`,
        lien: `/projets/${context.projectId}`,
        entityType: context.entityType,
        entityId: context.entityId,
      });
      await logExecution(rule.id, context, "Rappel envoyé.");
      return;
    }

    case "NOTIFY_STAKEHOLDERS": {
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: context.projectId },
        include: { members: true },
      });
      const stakeholderIds = [project.responsableId, ...project.members.map((m) => m.userId)];
      await notifyMany(stakeholderIds, "", {
        type: "MODIFICATION",
        titre: `Automatisation « ${rule.nom} » : ${context.label}`,
        lien: `/projets/${context.projectId}`,
        entityType: context.entityType,
        entityId: context.entityId,
      });
      await logExecution(rule.id, context, `${stakeholderIds.length} partie(s) prenante(s) notifiée(s).`);
      return;
    }
  }
}

async function logExecution(ruleId: string, context: AutomationContext, resultat: string) {
  await prisma.automationExecution.create({
    data: { ruleId, entityType: context.entityType, entityId: context.entityId, resultat },
  });
}

export async function runTaskCompletedRules(task: {
  id: string;
  titre: string;
  projectId: string;
  responsablePrincipalId: string;
}) {
  const rules = await prisma.automationRule.findMany({
    where: { projectId: task.projectId, trigger: "TASK_COMPLETED", isActive: true },
  });
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Task",
      entityId: task.id,
      label: task.titre,
      projectId: task.projectId,
      targetUserId: task.responsablePrincipalId,
    });
  }
}

export async function runValidationRejectedRules(task: {
  id: string;
  titre: string;
  projectId: string;
  responsablePrincipalId: string;
}) {
  const rules = await prisma.automationRule.findMany({
    where: { projectId: task.projectId, trigger: "TASK_VALIDATION_REJECTED", isActive: true },
  });
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Task",
      entityId: task.id,
      label: task.titre,
      projectId: task.projectId,
      targetUserId: task.responsablePrincipalId,
    });
  }
}

export async function runProjectCompletedRules(project: {
  id: string;
  nom: string;
  responsableId: string;
}) {
  const rules = await prisma.automationRule.findMany({
    where: { projectId: project.id, trigger: "PROJECT_COMPLETED", isActive: true },
  });
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Project",
      entityId: project.id,
      label: project.nom,
      projectId: project.id,
      targetUserId: project.responsableId,
    });
  }
}

/**
 * Évalue les règles DEADLINE_APPROACHING pour les tâches actives de
 * l'utilisateur, à la visite (même approche que les notifications
 * d'échéance — pas de vrai ordonnanceur dans ce MVP).
 */
export async function runDeadlineApproachingRules(userId: string) {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "DEADLINE_APPROACHING", isActive: true },
  });

  for (const rule of rules) {
    const days = rule.reminderDelaiJours ?? 3;
    const soon = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        projectId: rule.projectId,
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        statut: { in: ACTIVE_TASK_STATUSES },
        echeance: { not: null, lte: soon, gte: new Date() },
      },
      select: { id: true, titre: true, responsablePrincipalId: true },
    });

    for (const task of tasks) {
      await executeAction(rule, {
        entityType: "Task",
        entityId: task.id,
        label: task.titre,
        projectId: rule.projectId,
        targetUserId: task.responsablePrincipalId,
      });
    }
  }
}
