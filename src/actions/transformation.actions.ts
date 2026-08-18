"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createTransformationSchema,
  updateTransformationPhaseSchema,
  cancelTransformationSchema,
  type CreateTransformationInput,
  type UpdateTransformationPhaseInput,
  type CancelTransformationInput,
} from "@/lib/validations/transformation.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Digital Transformation Management (cahier des charges V3.0 §19). */
export async function createTransformation(input: CreateTransformationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = createTransformationSchema.parse(input);

  const transformation = await prisma.transformation.create({
    data: {
      nom: data.nom,
      type: data.type,
      description: data.description || undefined,
      departmentId: data.departmentId || undefined,
      responsableId: data.responsableId,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "transformation.created",
    entityType: "Transformation",
    entityId: transformation.id,
    changes: { nom: transformation.nom, type: transformation.type },
  });

  revalidatePath("/transformations");
  return { id: transformation.id };
}

/** Avance/recule la phase du cycle (cahier §19 : Diagnostic -> Plan -> Transformation -> Adoption -> Mesure -> Amélioration). */
export async function updateTransformationPhase(input: UpdateTransformationPhaseInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = updateTransformationPhaseSchema.parse(input);

  const transformation = await prisma.transformation.update({
    where: { id: data.id },
    data: { phase: data.phase, statut: data.phase === "AMELIORATION" ? "TERMINEE" : "EN_COURS" },
  });

  await logAudit({
    userId: session.user.id,
    action: "transformation.phase_updated",
    entityType: "Transformation",
    entityId: transformation.id,
    changes: { phase: transformation.phase },
  });

  // Mémoire organisationnelle (V3.0 §17/§18) — le bilan de fin de cycle
  // devient l'"expérience" consultable pour les futures transformations.
  if (data.phase === "AMELIORATION") {
    await prisma.organizationalMemoryEntry.create({
      data: {
        type: "EXPERIENCE",
        titre: `Transformation terminée : ${transformation.nom}`,
        contenu: data.bilan?.trim() || "Aucun bilan renseigné.",
        entityType: "Transformation",
        entityId: transformation.id,
        createdById: session.user.id,
      },
    });
    revalidatePath("/memoire-organisationnelle");
  }

  revalidatePath(`/transformations/${data.id}`);
  revalidatePath("/transformations");
  return { id: transformation.id, phase: transformation.phase };
}

export async function cancelTransformation(input: CancelTransformationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = cancelTransformationSchema.parse(input);

  const transformation = await prisma.transformation.update({
    where: { id: data.id },
    data: { statut: "ANNULEE" },
  });

  await logAudit({
    userId: session.user.id,
    action: "transformation.cancelled",
    entityType: "Transformation",
    entityId: transformation.id,
  });

  // Mémoire organisationnelle (V3.0 §17/§18) — trace le motif d'annulation.
  await prisma.organizationalMemoryEntry.create({
    data: {
      type: "ECHEC",
      titre: `Transformation annulée : ${transformation.nom}`,
      contenu: data.motif?.trim() || "Aucun motif renseigné.",
      entityType: "Transformation",
      entityId: transformation.id,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/transformations/${data.id}`);
  revalidatePath("/transformations");
  revalidatePath("/memoire-organisationnelle");
}
