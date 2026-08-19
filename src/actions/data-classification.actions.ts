"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { classifyDataSchema, type ClassifyDataInput } from "@/lib/validations/data-classification.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Data Governance (cahier des charges V3.0 §46) — classification/sensibilité/qualité/propriétaire d'une donnée. */
export async function classifyData(input: ClassifyDataInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DATA_BACKUP_MANAGE);
  const data = classifyDataSchema.parse(input);

  const classification = await prisma.dataClassification.upsert({
    where: { entityType_entityId: { entityType: data.entityType, entityId: data.entityId } },
    update: {
      niveau: data.niveau,
      sensibilite: data.sensibilite,
      qualite: data.qualite,
      proprietaireId: data.proprietaireId || null,
      notes: data.notes || undefined,
    },
    create: {
      entityType: data.entityType,
      entityId: data.entityId,
      niveau: data.niveau,
      sensibilite: data.sensibilite,
      qualite: data.qualite,
      proprietaireId: data.proprietaireId || undefined,
      notes: data.notes || undefined,
      classifiedById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "data_classification.updated",
    entityType: data.entityType,
    entityId: data.entityId,
    changes: { niveau: classification.niveau, sensibilite: classification.sensibilite },
  });

  revalidatePath("/gouvernance-donnees");
  return { id: classification.id };
}
