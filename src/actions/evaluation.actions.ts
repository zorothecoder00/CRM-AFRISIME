"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import {
  createEvaluationSchema,
  updateEvaluationSchema,
  addEvaluationCritereSchema,
  updateEvaluationCritereSchema,
  acknowledgeEvaluationSchema,
  type CreateEvaluationInput,
  type UpdateEvaluationInput,
  type AddEvaluationCritereInput,
  type UpdateEvaluationCritereInput,
  type AcknowledgeEvaluationInput,
} from "@/lib/validations/evaluation.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createEvaluation(input: CreateEvaluationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.EVALUATION_MANAGE);
  const data = createEvaluationSchema.parse(input);

  if (data.evalueId === session.user.id) {
    throw new Error("Vous ne pouvez pas créer votre propre évaluation.");
  }
  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const evalue = await prisma.user.findUniqueOrThrow({
    where: { id: data.evalueId },
    select: { departmentId: true },
  });

  const evaluation = await prisma.evaluation.create({
    data: {
      periode: data.periode,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      evalueId: data.evalueId,
      evaluateurId: session.user.id,
      departmentId: evalue.departmentId,
      pointsForts: data.pointsForts || undefined,
      axesAmelioration: data.axesAmelioration || undefined,
      commentaireEvaluateur: data.commentaireEvaluateur || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "evaluation.created",
    entityType: "Evaluation",
    entityId: evaluation.id,
    changes: { evalueId: evaluation.evalueId, periode: evaluation.periode },
  });

  revalidatePath("/evaluations");
  return evaluation;
}

export async function updateEvaluation(input: UpdateEvaluationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.EVALUATION_MANAGE);
  const data = updateEvaluationSchema.parse(input);

  const existing = await prisma.evaluation.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.evaluateurId !== session.user.id) {
    throw new Error("Seul l'évaluateur assigné peut modifier cette évaluation.");
  }
  if (existing.statut !== "BROUILLON") {
    throw new Error("Cette évaluation a déjà été soumise et ne peut plus être modifiée.");
  }
  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const evaluation = await prisma.evaluation.update({
    where: { id: data.id },
    data: {
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      pointsForts: data.pointsForts || undefined,
      axesAmelioration: data.axesAmelioration || undefined,
      commentaireEvaluateur: data.commentaireEvaluateur || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "evaluation.updated",
    entityType: "Evaluation",
    entityId: evaluation.id,
    changes: {},
  });

  revalidatePath(`/evaluations/${data.id}`);
  return evaluation;
}

export async function addEvaluationCritere(input: AddEvaluationCritereInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.EVALUATION_MANAGE);
  const data = addEvaluationCritereSchema.parse(input);

  const evaluation = await prisma.evaluation.findUniqueOrThrow({ where: { id: data.evaluationId } });
  if (evaluation.evaluateurId !== session.user.id) {
    throw new Error("Seul l'évaluateur assigné peut modifier cette évaluation.");
  }
  if (evaluation.statut !== "BROUILLON") {
    throw new Error("Cette évaluation a déjà été soumise et ne peut plus être modifiée.");
  }

  const note = Number(data.note);
  if (note < 0 || note > 5) {
    throw new Error("La note doit être comprise entre 0 et 5.");
  }

  const critere = await prisma.evaluationCritere.create({
    data: {
      evaluationId: data.evaluationId,
      libelle: data.libelle,
      note,
      commentaire: data.commentaire || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "evaluation.critere_added",
    entityType: "Evaluation",
    entityId: data.evaluationId,
    changes: { libelle: critere.libelle, note },
  });

  revalidatePath(`/evaluations/${data.evaluationId}`);
  return critere;
}

export async function updateEvaluationCritere(input: UpdateEvaluationCritereInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.EVALUATION_MANAGE);
  const data = updateEvaluationCritereSchema.parse(input);

  const critere = await prisma.evaluationCritere.findUniqueOrThrow({
    where: { id: data.critereId },
    include: { evaluation: true },
  });
  if (critere.evaluation.evaluateurId !== session.user.id) {
    throw new Error("Seul l'évaluateur assigné peut modifier cette évaluation.");
  }
  if (critere.evaluation.statut !== "BROUILLON") {
    throw new Error("Cette évaluation a déjà été soumise et ne peut plus être modifiée.");
  }

  const note = Number(data.note);
  if (note < 0 || note > 5) {
    throw new Error("La note doit être comprise entre 0 et 5.");
  }

  const updated = await prisma.evaluationCritere.update({
    where: { id: data.critereId },
    data: { note, commentaire: data.commentaire || undefined },
  });

  await logAudit({
    userId: session.user.id,
    action: "evaluation.critere_updated",
    entityType: "Evaluation",
    entityId: critere.evaluationId,
    changes: { critereId: critere.id, note },
  });

  revalidatePath(`/evaluations/${critere.evaluationId}`);
  return updated;
}

export async function submitEvaluation(evaluationId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.EVALUATION_MANAGE);

  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: { criteres: true },
  });
  if (evaluation.evaluateurId !== session.user.id) {
    throw new Error("Seul l'évaluateur assigné peut soumettre cette évaluation.");
  }
  if (evaluation.statut !== "BROUILLON") {
    throw new Error("Cette évaluation a déjà été soumise.");
  }
  if (evaluation.criteres.length === 0) {
    throw new Error("Ajoutez au moins un critère noté avant de soumettre l'évaluation.");
  }

  const scoreGlobal =
    evaluation.criteres.reduce((sum, c) => sum + Number(c.note), 0) / evaluation.criteres.length;

  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: { statut: "SOUMISE", dateSoumission: new Date(), scoreGlobal },
  });

  await logAudit({
    userId: session.user.id,
    action: "evaluation.submitted",
    entityType: "Evaluation",
    entityId: evaluationId,
    changes: { scoreGlobal },
  });

  await createNotification({
    userId: evaluation.evalueId,
    type: "VALIDATION",
    titre: "Votre évaluation de performance est disponible.",
    lien: `/evaluations/${evaluationId}`,
    entityType: "Evaluation",
    entityId: evaluationId,
  });

  revalidatePath(`/evaluations/${evaluationId}`);
  revalidatePath("/evaluations");
  return updated;
}

export async function acknowledgeEvaluation(input: AcknowledgeEvaluationInput) {
  const session = await requireSession();
  const data = acknowledgeEvaluationSchema.parse(input);

  const evaluation = await prisma.evaluation.findUniqueOrThrow({ where: { id: data.evaluationId } });
  if (evaluation.evalueId !== session.user.id) {
    throw new Error("Seul l'évalué peut accuser réception de cette évaluation.");
  }
  if (evaluation.statut !== "SOUMISE") {
    throw new Error("Cette évaluation n'est pas en attente d'accusé de réception.");
  }

  const updated = await prisma.evaluation.update({
    where: { id: data.evaluationId },
    data: {
      statut: "ACCUSE_RECEPTION",
      dateAccuseReception: new Date(),
      commentaireEvalue: data.commentaireEvalue || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "evaluation.acknowledged",
    entityType: "Evaluation",
    entityId: data.evaluationId,
    changes: {},
  });

  await createNotification({
    userId: evaluation.evaluateurId,
    type: "VALIDATION",
    titre: "Votre évaluation a été accusée réception par l'évalué.",
    lien: `/evaluations/${data.evaluationId}`,
    entityType: "Evaluation",
    entityId: data.evaluationId,
  });

  revalidatePath(`/evaluations/${data.evaluationId}`);
  revalidatePath("/evaluations");
  return updated;
}
