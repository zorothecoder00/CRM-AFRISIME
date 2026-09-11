import { prisma } from "@/lib/prisma";

/**
 * Revue de robustesse (2026-09-11) — le callback `session()` (auth.ts) ne
 * relit `permissions`/`roleKey` depuis la base qu'à la connexion : un
 * changement de rôle ou de permission n'a sinon d'effet qu'à la prochaine
 * reconnexion. Révoquer les sessions actives de l'utilisateur concerné force
 * un JWT à jour dès le prochain rendu de page (le callback `session()` vide
 * déjà `permissions` pour toute session révoquée, voir auth.ts).
 */
export async function revokeActiveSessionsForUser(userId: string, revokedById: string): Promise<number> {
  const { count } = await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedById },
  });
  return count;
}

/** Même principe, pour tous les utilisateurs actifs porteurs d'un rôle donné (ex. retrait d'une permission du rôle). */
export async function revokeActiveSessionsForRole(roleId: string, revokedById: string): Promise<number> {
  const users = await prisma.user.findMany({ where: { roleId }, select: { id: true } });
  if (users.length === 0) return 0;
  const { count } = await prisma.userSession.updateMany({
    where: { userId: { in: users.map((u) => u.id) }, revokedAt: null },
    data: { revokedAt: new Date(), revokedById },
  });
  return count;
}
