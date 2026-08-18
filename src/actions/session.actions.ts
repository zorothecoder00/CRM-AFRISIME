"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Révocation d'une session/appareil (cahier des charges V2.2 §36) — un
 * utilisateur peut toujours révoquer ses PROPRES sessions (autre onglet,
 * ancien appareil perdu…) sans permission particulière ; révoquer la
 * session d'un tiers exige SESSION_MANAGE. La révocation prend effet au
 * prochain rendu de page côté cible (voir callback session dans auth.ts).
 */
export async function revokeUserSession(sessionId: string) {
  const session = await requireSession();

  const target = await prisma.userSession.findUniqueOrThrow({ where: { id: sessionId } });
  const isOwn = target.userId === session.user.id;
  if (!isOwn && !session.user.permissions.includes(PERMISSIONS.SESSION_MANAGE)) {
    throw new Error("Permission refusée.");
  }

  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date(), revokedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "session.revoked",
    entityType: "UserSession",
    entityId: sessionId,
    changes: { targetUserId: target.userId, self: isOwn },
  });

  revalidatePath("/parametres/securite");
  revalidatePath("/administration/securite");
}
