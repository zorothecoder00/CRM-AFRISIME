import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Adresse IP du client à l'origine de la requête en cours (cahier des
 * charges §18/§23). `x-forwarded-for` peut contenir une liste "client,
 * proxy1, proxy2" derrière un reverse proxy — seul le premier maillon
 * (le client) nous intéresse. `headers()` échoue hors contexte de requête
 * (ex. script/tâche planifiée) : on avale l'erreur et on journalise sans IP
 * plutôt que de faire échouer l'action appelante.
 */
async function requestIpAddress(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
    return headersList.get("x-real-ip") ?? undefined;
  } catch {
    return undefined;
  }
}

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
      ipAddress: await requestIpAddress(),
    },
  });
}
