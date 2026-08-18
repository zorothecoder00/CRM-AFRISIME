"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createDecisionMatrixSchema,
  updateWeightsSchema,
  createDecisionOptionSchema,
  type CreateDecisionMatrixInput,
  type UpdateWeightsInput,
  type CreateDecisionOptionInput,
} from "@/lib/validations/decision-matrix.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createDecisionMatrix(input: CreateDecisionMatrixInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DECISION_MATRIX_MANAGE);

  const data = createDecisionMatrixSchema.parse(input);
  const matrix = await prisma.decisionMatrix.create({
    data: {
      titre: data.titre,
      contexte: data.contexte || undefined,
      projectId: data.projectId || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({ userId: session.user.id, action: "decision_matrix.created", entityType: "DecisionMatrix", entityId: matrix.id });
  revalidatePath("/decisions");
  return { id: matrix.id };
}

export async function updateDecisionWeights(input: UpdateWeightsInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DECISION_MATRIX_MANAGE);

  const data = updateWeightsSchema.parse(input);
  await prisma.decisionMatrix.update({
    where: { id: data.matrixId },
    data: {
      poidsCout: data.poidsCout,
      poidsDelai: data.poidsDelai,
      poidsRisque: data.poidsRisque,
      poidsImpact: data.poidsImpact,
      poidsRessources: data.poidsRessources,
      poidsRoi: data.poidsRoi,
      poidsFaisabilite: data.poidsFaisabilite,
    },
  });

  revalidatePath(`/decisions/${data.matrixId}`);
}

export async function createDecisionOption(input: CreateDecisionOptionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DECISION_MATRIX_MANAGE);

  const data = createDecisionOptionSchema.parse(input);
  const option = await prisma.decisionOption.create({
    data: {
      matrixId: data.matrixId,
      nom: data.nom,
      description: data.description || undefined,
      cout: data.cout,
      delaiJours: data.delaiJours,
      risque: data.risque,
      impact: data.impact,
      ressources: data.ressources,
      roiPercent: data.roiPercent,
      faisabilite: data.faisabilite,
    },
  });

  await logAudit({ userId: session.user.id, action: "decision_option.created", entityType: "DecisionOption", entityId: option.id });
  revalidatePath(`/decisions/${data.matrixId}`);
}

export async function deleteDecisionOption(optionId: string, matrixId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DECISION_MATRIX_MANAGE);

  await prisma.decisionOption.delete({ where: { id: optionId } });
  await logAudit({ userId: session.user.id, action: "decision_option.deleted", entityType: "DecisionOption", entityId: optionId });
  revalidatePath(`/decisions/${matrixId}`);
}
