import { prisma } from "@/lib/prisma";

/**
 * Messages non lus par conversation pour un utilisateur — UNE seule requête
 * (jointure participant/message + GROUP BY) au lieu d'un `message.count` par
 * conversation (N+1), qui s'exécutait à chaque navigation via le layout (app).
 *
 * Même règle qu'avant : messages d'un autre auteur, postérieurs au
 * `lastReadAt` du participant (ou tous si jamais lu). SQL brut car Prisma ne
 * sait pas comparer une colonne d'une relation (createdAt > lastReadAt).
 */
export async function unreadCountsByConversation(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ conversationId: string; unread: bigint }[]>`
    SELECT m."conversationId", COUNT(*) AS unread
    FROM "Message" m
    JOIN "ConversationParticipant" p
      ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."authorId" <> ${userId}
      AND m."createdAt" > COALESCE(p."lastReadAt", 'epoch'::timestamp)
    GROUP BY m."conversationId"
  `;
  return new Map(rows.map((r) => [r.conversationId, Number(r.unread)]));
}

/** Total tous canaux confondus — pastille de la topbar. */
export async function countUnreadMessages(userId: string): Promise<number> {
  const counts = await unreadCountsByConversation(userId);
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}
