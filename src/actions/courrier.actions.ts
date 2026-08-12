"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createCourrierSchema,
  updateCourrierSchema,
  updateCourrierStatusSchema,
  linkCourrierTaskSchema,
  type CreateCourrierInput,
  type UpdateCourrierInput,
  type UpdateCourrierStatusInput,
  type LinkCourrierTaskInput,
} from "@/lib/validations/courrier.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

async function generateReference() {
  const year = new Date().getFullYear();
  const prefix = `CRR-${year}-`;
  const count = await prisma.courrier.count({ where: { reference: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export async function createCourrier(input: CreateCourrierInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.COURRIER_MANAGE);
  const data = createCourrierSchema.parse(input);

  const reference = await generateReference();

  const courrier = await prisma.courrier.create({
    data: {
      reference,
      objet: data.objet,
      type: data.type,
      confidentiel: data.confidentiel ?? false,
      dateCourrier: new Date(data.dateCourrier),
      expediteur: data.expediteur || undefined,
      destinataire: data.destinataire || undefined,
      departmentId: data.departmentId || undefined,
      responsableId: data.responsableId || undefined,
      documentUrl: data.documentUrl || undefined,
      documentNom: data.documentNom || undefined,
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "courrier.created",
    entityType: "Courrier",
    entityId: courrier.id,
    changes: { reference: courrier.reference, type: courrier.type },
  });

  revalidatePath("/courrier");
  return courrier;
}

export async function updateCourrier(input: UpdateCourrierInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.COURRIER_MANAGE);
  const data = updateCourrierSchema.parse(input);

  const courrier = await prisma.courrier.update({
    where: { id: data.id },
    data: {
      objet: data.objet,
      type: data.type,
      confidentiel: data.confidentiel ?? false,
      dateCourrier: new Date(data.dateCourrier),
      expediteur: data.expediteur || undefined,
      destinataire: data.destinataire || undefined,
      departmentId: data.departmentId || null,
      responsableId: data.responsableId || null,
      documentUrl: data.documentUrl || undefined,
      documentNom: data.documentNom || undefined,
      notes: data.notes || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "courrier.updated",
    entityType: "Courrier",
    entityId: courrier.id,
    changes: { objet: courrier.objet },
  });

  revalidatePath(`/courrier/${courrier.id}`);
  revalidatePath("/courrier");
  return courrier;
}

export async function updateCourrierStatus(input: UpdateCourrierStatusInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.COURRIER_MANAGE);
  const data = updateCourrierStatusSchema.parse(input);

  const courrier = await prisma.courrier.update({
    where: { id: data.courrierId },
    data: { statut: data.statut },
  });

  await logAudit({
    userId: session.user.id,
    action: "courrier.status_updated",
    entityType: "Courrier",
    entityId: courrier.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/courrier/${data.courrierId}`);
  revalidatePath("/courrier");
  return courrier;
}

/** Rattache (ou detache si taskId absent) une tache existante a ce courrier. */
export async function linkCourrierTask(input: LinkCourrierTaskInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.COURRIER_MANAGE);
  const data = linkCourrierTaskSchema.parse(input);

  const courrier = await prisma.courrier.update({
    where: { id: data.courrierId },
    data: { taskId: data.taskId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: data.taskId ? "courrier.task_linked" : "courrier.task_unlinked",
    entityType: "Courrier",
    entityId: courrier.id,
    changes: { taskId: data.taskId ?? null },
  });

  revalidatePath(`/courrier/${data.courrierId}`);
  return courrier;
}
