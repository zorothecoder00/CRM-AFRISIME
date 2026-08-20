import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

/**
 * Comble V2.2 §7.1 : Contract.statut ne basculait jamais tout seul (portée
 * volontairement minimale du modèle, voir schema.prisma) — un contrat resté
 * ACTIF passé sa date d'expiration ne le redevenait qu'après une
 * modification manuelle. Bascule quotidienne (cron daily-checks) vers
 * EXPIRE + notification au créateur du contrat, lien vers l'opportunité ou
 * l'organisation liée (à défaut le pipeline).
 *
 * Effet de bord à connaître : early-warning.ts utilisait "ACTIF + expiré"
 * comme proxy de "retards fournisseurs" faute de mieux — cette bascule
 * automatique rend ce proxy quasi toujours nul (voir early-warning.ts,
 * ajusté en conséquence pour compter les expirations récentes plutôt que
 * les oublis prolongés).
 */
export async function expireOutdatedContracts() {
  const now = new Date();
  const outdated = await prisma.contract.findMany({
    where: { statut: "ACTIF", dateExpiration: { lt: now } },
    select: { id: true, nom: true, createdById: true, opportunityId: true, organizationId: true },
  });
  if (outdated.length === 0) return { expiredCount: 0 };

  await prisma.contract.updateMany({
    where: { id: { in: outdated.map((c) => c.id) } },
    data: { statut: "EXPIRE" },
  });

  await Promise.all(
    outdated.map((c) =>
      createNotification({
        userId: c.createdById,
        type: "CONTRAT_EXPIRE",
        titre: `Contrat expiré : ${c.nom}`,
        lien: c.opportunityId
          ? `/crm/opportunites/${c.opportunityId}`
          : c.organizationId
            ? `/crm/organisations/${c.organizationId}`
            : "/crm/pipeline",
        entityType: "Contract",
        entityId: c.id,
      })
    )
  );

  return { expiredCount: outdated.length };
}
