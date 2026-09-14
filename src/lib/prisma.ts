import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Analyse perf/charge (2026-09-14) — la prod (Vercel + Neon) passe déjà par
// le pooler Neon (PgBouncer : l'hôte de DATABASE_URL porte le suffixe
// "-pooler", vérifié lors de la migration du 2026-09-14), donc le vrai
// multiplexage vers Postgres est déjà en place. Ce qui manquait ici était
// purement côté pool node-postgres local à l'adaptateur (une instance par
// process/lambda), qui tournait avec les réglages par défaut de `pg` :
// AUCUN timeout d'acquisition de connexion (connectionTimeoutMillis non
// défini = attente indéfinie). Sous forte charge, une requête qui ne
// trouvait pas de connexion libre dans le pool restait donc bloquée sans
// jamais échouer proprement — jusqu'au timeout de la fonction serverless
// elle-même, sans message d'erreur exploitable. `max` (10 par défaut) n'est
// volontairement pas réduit : ce pool est partagé par toutes les requêtes
// Prisma d'une même instance (y compris les Promise.all introduits dans
// cette même analyse — dashboard, automation.ts, ai-agents.ts...), le
// resserrer risquerait de créer artificiellement la contention qu'on vient
// de résoudre ; le pooler Neon reste la bonne couche pour absorber le
// nombre d'instances concurrentes, pas ce pool local.
const adapter = new PrismaPg(
  {
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
  },
  {
    // Observabilité — ces erreurs (ex. connexion coupée côté serveur/pooler
    // pendant qu'un client du pool était inactif) étaient jusqu'ici
    // silencieuses (avalées dans le log debug interne de l'adaptateur),
    // aucun outil de monitoring/tracing n'étant configuré par ailleurs
    // (voir next.config.ts, note Observabilité).
    onPoolError: (err) => console.error("[prisma] erreur pool pg (client inactif) :", err),
    onConnectionError: (err) => console.error("[prisma] erreur connexion pg :", err),
  }
);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
