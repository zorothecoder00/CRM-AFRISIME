"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createSuccessionPlanSchema,
  updateSuccessionPlanSchema,
  addSuccessionCandidateSchema,
  idSchema,
  type CreateSuccessionPlanInput,
  type UpdateSuccessionPlanInput,
  type AddSuccessionCandidateInput,
  type IdInput,
} from "@/lib/validations/succession.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Talent & Succession Planning (cahier des charges V3.0 §24). */
export async function createSuccessionPlan(input: CreateSuccessionPlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.SUCCESSION_MANAGE);
  const data = createSuccessionPlanSchema.parse(input);

  const plan = await prisma.successionPlan.create({
    data: {
      posteId: data.posteId,
      titulaireId: data.titulaireId || undefined,
      competencesRequises: data.competencesRequises || undefined,
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "succession_plan.created",
    entityType: "SuccessionPlan",
    entityId: plan.id,
    changes: { posteId: plan.posteId },
  });

  revalidatePath("/succession");
  return { id: plan.id };
}

export async function updateSuccessionPlan(input: UpdateSuccessionPlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.SUCCESSION_MANAGE);
  const data = updateSuccessionPlanSchema.parse(input);

  const plan = await prisma.successionPlan.update({
    where: { id: data.id },
    data: {
      titulaireId: data.titulaireId || null,
      competencesRequises: data.competencesRequises || undefined,
      statut: data.statut,
      notes: data.notes || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "succession_plan.updated",
    entityType: "SuccessionPlan",
    entityId: plan.id,
    changes: { statut: plan.statut },
  });

  revalidatePath("/succession");
  return { id: plan.id };
}

export async function addSuccessionCandidate(input: AddSuccessionCandidateInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.SUCCESSION_MANAGE);
  const data = addSuccessionCandidateSchema.parse(input);

  const candidate = await prisma.successionCandidate.upsert({
    where: { successionPlanId_userId: { successionPlanId: data.successionPlanId, userId: data.userId } },
    update: { potentiel: data.potentiel, pretDans: data.pretDans || undefined, notes: data.notes || undefined },
    create: {
      successionPlanId: data.successionPlanId,
      userId: data.userId,
      potentiel: data.potentiel,
      pretDans: data.pretDans || undefined,
      notes: data.notes || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "succession_plan.candidate_added",
    entityType: "SuccessionPlan",
    entityId: data.successionPlanId,
    changes: { userId: data.userId, potentiel: data.potentiel },
  });

  revalidatePath("/succession");
  return candidate;
}

export async function removeSuccessionCandidate(input: IdInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.SUCCESSION_MANAGE);
  const { id } = idSchema.parse(input);

  const candidate = await prisma.successionCandidate.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "succession_plan.candidate_removed",
    entityType: "SuccessionPlan",
    entityId: candidate.successionPlanId,
    changes: { userId: candidate.userId },
  });

  revalidatePath("/succession");
}

export async function deleteSuccessionPlan(input: IdInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.SUCCESSION_MANAGE);
  const { id } = idSchema.parse(input);

  const plan = await prisma.successionPlan.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "succession_plan.deleted",
    entityType: "SuccessionPlan",
    entityId: plan.id,
  });

  revalidatePath("/succession");
}
