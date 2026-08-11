import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Journalise une mutation (cahier des charges §23 : « journalisation
 * complète des actions »). Réutilise le format déjà en place dans
 * task.actions.ts/security.actions.ts pour rester compatible avec les
 * entrées existantes.
 */
export async function logAudit(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes,
    },
  });
}
