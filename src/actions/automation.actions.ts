"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createRuleSchema, type CreateRuleInput } from "@/lib/validations/automation.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createRule(input: CreateRuleInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUTOMATION_MANAGE);

  const data = createRuleSchema.parse(input);

  const rule = await prisma.automationRule.create({
    data: {
      projectId: data.projectId || undefined,
      nom: data.nom,
      trigger: data.trigger,
      action: data.action,
      niveauIA: data.niveauIA,
      playbookId: data.playbookId || undefined,
      ordre: data.ordre ? Number(data.ordre) : undefined,
      nextTaskTitre: data.nextTaskTitre,
      nextTaskResponsableId: data.nextTaskResponsableId || undefined,
      nextTaskDelaiJours: data.nextTaskDelaiJours ? Number(data.nextTaskDelaiJours) : undefined,
      reminderDelaiJours: data.reminderDelaiJours ? Number(data.reminderDelaiJours) : undefined,
      assignUserId: data.assignUserId || undefined,
      changeStatusValue: data.changeStatusValue || undefined,
      meetingTitre: data.meetingTitre || undefined,
      meetingDelaiJours: data.meetingDelaiJours ? Number(data.meetingDelaiJours) : undefined,
      adminRequestType: data.adminRequestType || undefined,
      adminRequestTitre: data.adminRequestTitre || undefined,
      riskTitre: data.riskTitre || undefined,
      riskProbabilite: data.riskProbabilite || undefined,
      riskImpact: data.riskImpact || undefined,
      reportType: data.reportType || undefined,
      targetRuleId: data.targetRuleId || undefined,
      deadlineTitre: data.deadlineTitre || undefined,
      deadlineDelaiJours: data.deadlineDelaiJours ? Number(data.deadlineDelaiJours) : undefined,
      elseRuleId: data.elseRuleId || undefined,
      createdById: session.user.id,
      conditions: {
        create: data.conditions.map((c, index) => ({
          champ: c.champ,
          operateur: c.operateur,
          valeur: c.valeur,
          connecteur: c.connecteur,
          ordre: index,
        })),
      },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "automation_rule.created",
    entityType: "AutomationRule",
    entityId: rule.id,
    changes: { nom: rule.nom, trigger: data.trigger, action: data.action },
  });

  revalidatePath("/automatisations");
  revalidatePath("/orchestration");
  if (data.projectId) revalidatePath(`/projets/${data.projectId}`);
  return rule;
}

export async function toggleRuleActive(ruleId: string, isActive: boolean) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUTOMATION_MANAGE);

  const rule = await prisma.automationRule.update({
    where: { id: ruleId },
    data: { isActive },
  });

  await logAudit({
    userId: session.user.id,
    action: isActive ? "automation_rule.activated" : "automation_rule.deactivated",
    entityType: "AutomationRule",
    entityId: rule.id,
  });

  revalidatePath("/automatisations");
  revalidatePath("/orchestration");
  if (rule.projectId) revalidatePath(`/projets/${rule.projectId}`);
  return rule;
}
