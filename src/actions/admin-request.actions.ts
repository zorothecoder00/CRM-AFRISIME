"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notify";
import {
  startAdminRequestValidationRun,
  decideAdminRequestCurrentStep,
} from "@/lib/admin-request-workflow";
import { createAdminRequestSchema, type CreateAdminRequestInput } from "@/lib/validations/admin-request.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Cree la demande et la soumet immediatement au circuit actif (pas d'etat brouillon, comme Leave). */
export async function createAdminRequest(input: CreateAdminRequestInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ADMIN_REQUEST_CREATE);
  const data = createAdminRequestSchema.parse(input);

  const request = await prisma.adminRequest.create({
    data: {
      type: data.type,
      titre: data.titre,
      description: data.description || undefined,
      montant: data.montant ? Number(data.montant) : undefined,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
      departmentId: data.departmentId || undefined,
      demandeurId: session.user.id,
    },
  });

  await startAdminRequestValidationRun({
    adminRequestId: request.id,
    titre: request.titre,
    submittedById: session.user.id,
  });

  revalidatePath("/demandes");
  return request;
}

/** Decide l'etape courante du circuit — miroir de validateTask. */
export async function decideAdminRequest(requestId: string, approved: boolean, commentaire?: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ADMIN_REQUEST_VALIDATE);

  const existing = await prisma.adminRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (existing.statut !== "EN_ATTENTE") {
    throw new Error("Cette demande n'est pas en attente de validation.");
  }

  const { finalStatus } = await decideAdminRequestCurrentStep({
    adminRequestId: requestId,
    approverId: session.user.id,
    approverRoleKey: session.user.roleKey,
    approved,
    commentaire,
  });

  if (finalStatus === "EN_COURS") {
    revalidatePath(`/demandes/${requestId}`);
    return existing;
  }

  const request = await prisma.adminRequest.update({
    where: { id: requestId },
    data: { statut: finalStatus === "APPROUVE" ? "APPROUVEE" : "REJETEE" },
  });

  if (request.demandeurId !== session.user.id) {
    await createNotification({
      userId: request.demandeurId,
      type: "VALIDATION",
      titre:
        finalStatus === "APPROUVE"
          ? `Votre demande a été approuvée : ${request.titre}`
          : `Votre demande a été refusée : ${request.titre}`,
      lien: `/demandes/${requestId}`,
      entityType: "AdminRequest",
      entityId: request.id,
    });
  }

  revalidatePath(`/demandes/${requestId}`);
  revalidatePath("/demandes");
  return request;
}
