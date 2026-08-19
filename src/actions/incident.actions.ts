"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";
import {
  createIncidentSchema,
  updateIncidentStatutSchema,
  escalateIncidentSchema,
  type CreateIncidentInput,
  type UpdateIncidentStatutInput,
  type EscalateIncidentInput,
} from "@/lib/validations/incident.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Déclaration d'incident (cahier des charges V3.0 §42, "Mobile-First
 * Execution" — les collaborateurs terrain doivent pouvoir signaler un
 * incident depuis le mobile). Le modèle Incident existait déjà (v2.0 §10,
 * consommé par digital-twin/early-warning/organizational-memory/reports)
 * mais n'avait aucune page pour le créer — comble ce trou. Ouvert à tout
 * utilisateur authentifié, volontairement sans permission dédiée : signaler
 * un incident ne doit jamais être bloqué par un rôle sur le terrain.
 */
export async function createIncident(input: CreateIncidentInput) {
  const session = await requireSession();
  const data = createIncidentSchema.parse(input);

  const incident = await prisma.incident.create({
    data: {
      type: data.type,
      titre: data.titre,
      description: data.description || undefined,
      criticite: data.criticite,
      projectId: data.projectId || undefined,
      declareParId: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "incident.declared",
    entityType: "Incident",
    entityId: incident.id,
    changes: { titre: incident.titre, criticite: incident.criticite },
  });

  revalidatePath("/incidents");
  return { id: incident.id };
}

export async function updateIncidentStatut(input: UpdateIncidentStatutInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.RISK_MANAGE);
  const data = updateIncidentStatutSchema.parse(input);

  const incident = await prisma.incident.update({
    where: { id: data.id },
    data: { statut: data.statut, dateCloture: data.statut === "CLOTURE" ? new Date() : undefined },
  });

  await logAudit({
    userId: session.user.id,
    action: "incident.statut_updated",
    entityType: "Incident",
    entityId: incident.id,
    changes: { statut: incident.statut },
  });

  revalidatePath("/incidents");
  return { id: incident.id };
}

export async function escalateIncident(input: EscalateIncidentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.RISK_MANAGE);
  const data = escalateIncidentSchema.parse(input);

  const incident = await prisma.incident.update({
    where: { id: data.id },
    data: { estEscalade: true, escaladeAId: data.escaladeAId },
  });

  await createNotification({
    userId: data.escaladeAId,
    type: "MODIFICATION",
    titre: `Incident escaladé : ${incident.titre}`,
    lien: "/incidents",
    entityType: "Incident",
    entityId: incident.id,
  });

  await logAudit({
    userId: session.user.id,
    action: "incident.escalated",
    entityType: "Incident",
    entityId: incident.id,
    changes: { escaladeAId: data.escaladeAId },
  });

  revalidatePath("/incidents");
  return { id: incident.id };
}
