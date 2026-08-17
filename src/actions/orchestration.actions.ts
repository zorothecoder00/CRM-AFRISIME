"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createPlaybookSchema, type CreatePlaybookInput } from "@/lib/validations/orchestration.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Crée un OrchestrationPlaybook et ses étapes en une transaction (V2.2 §8) :
 * chaque étape EST une AutomationRule (playbookId + ordre renseignés),
 * exécutée par le moteur existant (src/lib/automation.ts) dans l'ordre créé
 * ici — aucune logique d'exécution dédiée n'est nécessaire.
 */
export async function createPlaybook(input: CreatePlaybookInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUTOMATION_MANAGE);

  const data = createPlaybookSchema.parse(input);

  const playbook = await prisma.$transaction(async (tx) => {
    const created = await tx.orchestrationPlaybook.create({
      data: {
        nom: data.nom,
        description: data.description || undefined,
        trigger: data.trigger,
        projectId: data.projectId || undefined,
        createdById: session.user.id,
      },
    });

    for (const [index, step] of data.steps.entries()) {
      await tx.automationRule.create({
        data: {
          projectId: data.projectId || undefined,
          nom: step.nom,
          trigger: data.trigger,
          action: step.action,
          playbookId: created.id,
          ordre: index,
          nextTaskTitre: step.nextTaskTitre,
          nextTaskResponsableId: step.nextTaskResponsableId || undefined,
          nextTaskDelaiJours: step.nextTaskDelaiJours ? Number(step.nextTaskDelaiJours) : undefined,
          reminderDelaiJours: step.reminderDelaiJours ? Number(step.reminderDelaiJours) : undefined,
          assignUserId: step.assignUserId || undefined,
          changeStatusValue: step.changeStatusValue || undefined,
          meetingTitre: step.meetingTitre || undefined,
          meetingDelaiJours: step.meetingDelaiJours ? Number(step.meetingDelaiJours) : undefined,
          adminRequestType: step.adminRequestType || undefined,
          adminRequestTitre: step.adminRequestTitre || undefined,
          riskTitre: step.riskTitre || undefined,
          riskProbabilite: step.riskProbabilite || undefined,
          riskImpact: step.riskImpact || undefined,
          reportType: step.reportType || undefined,
          targetRuleId: step.targetRuleId || undefined,
          createdById: session.user.id,
          conditions: {
            create: step.conditions.map((c, ci) => ({
              champ: c.champ,
              operateur: c.operateur,
              valeur: c.valeur,
              connecteur: c.connecteur,
              ordre: ci,
            })),
          },
        },
      });
    }

    return created;
  });

  await logAudit({
    userId: session.user.id,
    action: "orchestration_playbook.created",
    entityType: "OrchestrationPlaybook",
    entityId: playbook.id,
    changes: { nom: playbook.nom, trigger: data.trigger, steps: data.steps.length },
  });

  revalidatePath("/orchestration");
  return playbook;
}

export async function togglePlaybookActive(playbookId: string, isActive: boolean) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUTOMATION_MANAGE);

  const [playbook] = await prisma.$transaction([
    prisma.orchestrationPlaybook.update({ where: { id: playbookId }, data: { isActive } }),
    prisma.automationRule.updateMany({ where: { playbookId }, data: { isActive } }),
  ]);

  await logAudit({
    userId: session.user.id,
    action: isActive ? "orchestration_playbook.activated" : "orchestration_playbook.deactivated",
    entityType: "OrchestrationPlaybook",
    entityId: playbook.id,
  });

  revalidatePath("/orchestration");
  return playbook;
}
