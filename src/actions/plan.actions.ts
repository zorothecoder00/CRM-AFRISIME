"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createPlanSchema,
  updatePlanSchema,
  linkObjectiveToPlanSchema,
  linkProgrammeToPlanSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
  type LinkObjectiveToPlanInput,
  type LinkProgrammeToPlanInput,
} from "@/lib/validations/plan.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Meme principe que assertNoCycle pour Department : un plan ne peut pas devenir son propre ancetre. */
async function assertNoCycle(planId: string, parentId: string) {
  if (parentId === planId) {
    throw new Error("Un plan ne peut pas être son propre plan parent.");
  }
  let currentId: string | null = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === planId) {
      throw new Error("Ce rattachement créerait une boucle dans la cascade de plans.");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { parentId: string | null } | null = await prisma.plan.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

export async function createPlan(input: CreatePlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = createPlanSchema.parse(input);

  const plan = await prisma.plan.create({
    data: {
      nom: data.nom,
      niveau: data.niveau,
      description: data.description || undefined,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      budgetIndicatif: data.budgetIndicatif ? Number(data.budgetIndicatif) : undefined,
      priorites: data.priorites || undefined,
      departmentId: data.departmentId || undefined,
      parentId: data.parentId || undefined,
      ownerId: data.ownerId,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "plan.created",
    entityType: "Plan",
    entityId: plan.id,
    changes: { nom: plan.nom, niveau: plan.niveau },
  });

  revalidatePath("/planification");
  return plan;
}

export async function updatePlan(input: UpdatePlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = updatePlanSchema.parse(input);

  if (data.parentId) {
    await assertNoCycle(data.id, data.parentId);
  }

  const plan = await prisma.plan.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      niveau: data.niveau,
      description: data.description || undefined,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      budgetIndicatif: data.budgetIndicatif ? Number(data.budgetIndicatif) : undefined,
      priorites: data.priorites || undefined,
      departmentId: data.departmentId || null,
      parentId: data.parentId || null,
      ownerId: data.ownerId,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "plan.updated",
    entityType: "Plan",
    entityId: plan.id,
    changes: { nom: plan.nom },
  });

  revalidatePath(`/planification/${data.id}`);
  revalidatePath("/planification");
  return plan;
}

/** Rattache (ou detache si planId absent) un objectif existant a un plan. */
export async function linkObjectiveToPlan(input: LinkObjectiveToPlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = linkObjectiveToPlanSchema.parse(input);

  const objective = await prisma.objective.update({
    where: { id: data.objectiveId },
    data: { planId: data.planId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: data.planId ? "plan.objective_linked" : "plan.objective_unlinked",
    entityType: "Objective",
    entityId: objective.id,
    changes: { planId: data.planId ?? null },
  });

  if (data.planId) revalidatePath(`/planification/${data.planId}`);
  revalidatePath("/planification");
  return objective;
}

/** Rattache (ou detache si planId absent) un programme existant a un plan. */
export async function linkProgrammeToPlan(input: LinkProgrammeToPlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = linkProgrammeToPlanSchema.parse(input);

  const programme = await prisma.programme.update({
    where: { id: data.programmeId },
    data: { planId: data.planId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: data.planId ? "plan.programme_linked" : "plan.programme_unlinked",
    entityType: "Programme",
    entityId: programme.id,
    changes: { planId: data.planId ?? null },
  });

  if (data.planId) revalidatePath(`/planification/${data.planId}`);
  revalidatePath("/planification");
  revalidatePath("/programmes");
  return programme;
}
