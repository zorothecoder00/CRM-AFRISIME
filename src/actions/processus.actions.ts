"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createProcessusSchema,
  updateProcessusStatutSchema,
  createProcessusVersionSchema,
  addEtapeSchema,
  reorderEtapesSchema,
  startExecutionSchema,
  advanceExecutionSchema,
  closeExecutionSchema,
  addProcessusDocumentSchema,
  type CreateProcessusInput,
  type AddEtapeInput,
  type ReorderEtapesInput,
  type StartExecutionInput,
  type AddProcessusDocumentInput,
} from "@/lib/validations/processus.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createProcessus(input: CreateProcessusInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = createProcessusSchema.parse(input);

  const processus = await prisma.processus.create({
    data: {
      nom: data.nom,
      description: data.description,
      processusParentId: data.processusParentId || undefined,
      responsableId: data.responsableId || undefined,
      delaiJours: data.delaiJours,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "processus.created",
    entityType: "Processus",
    entityId: processus.id,
    changes: { nom: processus.nom },
  });

  revalidatePath("/processus");
  return processus;
}

export async function updateProcessusStatut(processusId: string, statut: "BROUILLON" | "ACTIF" | "ARCHIVE") {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = updateProcessusStatutSchema.parse({ processusId, statut });

  const processus = await prisma.processus.update({
    where: { id: data.processusId },
    data: { statut: data.statut },
  });

  await logAudit({
    userId: session.user.id,
    action: "processus.statut_updated",
    entityType: "Processus",
    entityId: processus.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/processus/${processusId}`);
  return processus;
}

export async function createProcessusVersion(processusId: string, note?: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = createProcessusVersionSchema.parse({ processusId, note });

  const processus = await prisma.processus.update({
    where: { id: data.processusId },
    data: { version: { increment: 1 } },
  });

  const version = await prisma.processusVersion.create({
    data: {
      processusId: data.processusId,
      version: processus.version,
      note: data.note,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/processus/${processusId}`);
  return version;
}

export async function addEtape(input: AddEtapeInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = addEtapeSchema.parse(input);

  const last = await prisma.processusEtape.findFirst({
    where: { processusId: data.processusId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });

  const etape = await prisma.processusEtape.create({
    data: {
      processusId: data.processusId,
      nom: data.nom,
      ordre: (last?.ordre ?? -1) + 1,
      responsableId: data.responsableId || undefined,
      delaiJours: data.delaiJours,
      entrees: data.entrees,
      sorties: data.sorties,
      regles: data.regles,
    },
  });

  revalidatePath(`/processus/${data.processusId}`);
  return etape;
}

export async function deleteEtape(etapeId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const etape = await prisma.processusEtape.delete({ where: { id: etapeId } });
  revalidatePath(`/processus/${etape.processusId}`);
}

/** Réordonnancement par glisser-déposer (§4.3, "Process Designer"). */
export async function reorderEtapes(input: ReorderEtapesInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = reorderEtapesSchema.parse(input);

  await prisma.$transaction(
    data.etapeIds.map((id, index) =>
      prisma.processusEtape.update({ where: { id }, data: { ordre: index } })
    )
  );

  revalidatePath(`/processus/${data.processusId}`);
}

export async function addProcessusDocument(input: AddProcessusDocumentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = addProcessusDocumentSchema.parse(input);

  const document = await prisma.processusDocument.create({
    data: {
      processusId: data.processusId,
      nom: data.nom,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      uploadedById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "processus.document_added",
    entityType: "Processus",
    entityId: data.processusId,
    changes: { nom: document.nom },
  });

  revalidatePath(`/processus/${data.processusId}`);
  return document;
}

export async function deleteProcessusDocument(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const document = await prisma.processusDocument.delete({ where: { id: documentId } });
  revalidatePath(`/processus/${document.processusId}`);
}

/** Démarre un nouveau dossier sur la première étape du processus. */
export async function startExecution(input: StartExecutionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = startExecutionSchema.parse(input);

  const premiereEtape = await prisma.processusEtape.findFirst({
    where: { processusId: data.processusId },
    orderBy: { ordre: "asc" },
  });

  const execution = await prisma.processusExecution.create({
    data: {
      processusId: data.processusId,
      libelle: data.libelle,
      etapeActuelleId: premiereEtape?.id,
      createdById: session.user.id,
    },
  });

  if (premiereEtape) {
    await prisma.processusExecutionEtape.create({
      data: { executionId: execution.id, etapeId: premiereEtape.id },
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "processus_execution.started",
    entityType: "ProcessusExecution",
    entityId: execution.id,
    changes: { processusId: data.processusId, libelle: data.libelle },
  });

  revalidatePath(`/processus/${data.processusId}`);
  return execution;
}

/** Fait avancer un dossier vers l'étape suivante : clôt le passage courant, en ouvre un nouveau. */
export async function advanceExecution(executionId: string, etapeId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = advanceExecutionSchema.parse({ executionId, etapeId });

  const enCours = await prisma.processusExecutionEtape.findFirst({
    where: { executionId: data.executionId, dateSortie: null },
    orderBy: { dateEntree: "desc" },
  });
  if (enCours) {
    await prisma.processusExecutionEtape.update({
      where: { id: enCours.id },
      data: { dateSortie: new Date() },
    });
  }

  const execution = await prisma.processusExecution.update({
    where: { id: data.executionId },
    data: { etapeActuelleId: data.etapeId },
  });

  await prisma.processusExecutionEtape.create({
    data: { executionId: data.executionId, etapeId: data.etapeId },
  });

  revalidatePath(`/processus/${execution.processusId}`);
  return execution;
}

/** Clôture un dossier (terminé, rejeté ou annulé) — clôt aussi le passage d'étape courant. */
export async function closeExecution(executionId: string, statut: "TERMINE" | "REJETE" | "ANNULE") {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROCESS_MANAGE);

  const data = closeExecutionSchema.parse({ executionId, statut });

  const enCours = await prisma.processusExecutionEtape.findFirst({
    where: { executionId: data.executionId, dateSortie: null },
    orderBy: { dateEntree: "desc" },
  });
  if (enCours) {
    await prisma.processusExecutionEtape.update({
      where: { id: enCours.id },
      data: { dateSortie: new Date() },
    });
  }

  const execution = await prisma.processusExecution.update({
    where: { id: data.executionId },
    data: { statut: data.statut, dateFin: new Date() },
  });

  await logAudit({
    userId: session.user.id,
    action: "processus_execution.closed",
    entityType: "ProcessusExecution",
    entityId: execution.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/processus/${execution.processusId}`);
  return execution;
}
