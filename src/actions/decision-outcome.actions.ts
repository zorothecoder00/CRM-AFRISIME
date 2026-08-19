"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createDecisionOutcomeSchema,
  evaluateDecisionOutcomeSchema,
  type CreateDecisionOutcomeInput,
  type EvaluateDecisionOutcomeInput,
} from "@/lib/validations/decision-outcome.schema";

const EVALUATION_DELAY_MONTHS = 6;

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Decision Intelligence (cahier des charges V3.0 §37) — trace une décision pour en mesurer les conséquences plus tard. */
export async function createDecisionOutcome(input: CreateDecisionOutcomeInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DECISION_MATRIX_MANAGE);
  const data = createDecisionOutcomeSchema.parse(input);

  const dateDecision = new Date(data.dateDecision);
  const dateEvaluationPrevue = new Date(dateDecision);
  dateEvaluationPrevue.setMonth(dateEvaluationPrevue.getMonth() + EVALUATION_DELAY_MONTHS);

  const outcome = await prisma.decisionOutcome.create({
    data: {
      titre: data.titre,
      description: data.description || undefined,
      dateDecision,
      dateEvaluationPrevue,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "decision_outcome.created",
    entityType: "DecisionOutcome",
    entityId: outcome.id,
    changes: { titre: outcome.titre },
  });

  revalidatePath("/intelligence-decisions");
  return { id: outcome.id };
}

/** Évaluation des conséquences d'une décision (§37) — alimente aussi la mémoire organisationnelle (§17-18). */
export async function evaluateDecisionOutcome(input: EvaluateDecisionOutcomeInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DECISION_MATRIX_MANAGE);
  const data = evaluateDecisionOutcomeSchema.parse(input);

  const outcome = await prisma.decisionOutcome.update({
    where: { id: data.id },
    data: {
      objectifAtteint: data.objectifAtteint,
      coutReel: data.coutReel ?? undefined,
      delaiJours: data.delaiJours ?? undefined,
      performance: data.performance || undefined,
      incidents: data.incidents || undefined,
      roiPercent: data.roiPercent ?? undefined,
      enseignements: data.enseignements || undefined,
      evaluatedAt: new Date(),
      evaluatedById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "decision_outcome.evaluated",
    entityType: "DecisionOutcome",
    entityId: outcome.id,
    changes: { objectifAtteint: outcome.objectifAtteint },
  });

  if (outcome.enseignements) {
    await prisma.organizationalMemoryEntry.create({
      data: {
        type: outcome.objectifAtteint ? "SUCCES" : "ECHEC",
        titre: `Décision évaluée : ${outcome.titre}`,
        contenu: outcome.enseignements,
        entityType: "DecisionOutcome",
        entityId: outcome.id,
        createdById: session.user.id,
      },
    });
    revalidatePath("/memoire-organisationnelle");
  }

  revalidatePath("/intelligence-decisions");
  return { id: outcome.id };
}
