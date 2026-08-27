import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Multi-tenant Phase 3 (V3.0 §27, preuve de concept — voir migration
 * enable_rls_user_department) — injecte app.current_org_id pour la durée
 * d'une transaction, seule fenêtre où `SET LOCAL`/`set_config(..., true)`
 * reste valide (il expire à la fin de la transaction, pas de la connexion :
 * indispensable avec un pool de connexions partagé, sinon une connexion
 * réutilisée par une autre requête garderait le org_id du tenant précédent).
 *
 * Ceci est un mécanisme EXPLICITE (l'appelant doit utiliser withTenantScope),
 * pas une extension Prisma transparente appliquée automatiquement à tous les
 * appels existants — ce dernier serait l'étape suivante (rollout complet
 * Phase 3), volontairement hors de cette preuve de concept qui ne couvre que
 * User/Department.
 *
 * `connectionString` doit pointer vers un rôle Postgres NON PROPRIÉTAIRE des
 * tables (voir scripts/setup-local-rls-test-role.ts) : le rôle propriétaire
 * (celui de DATABASE_URL utilisé par le reste de l'app) est exempté de RLS
 * par construction PostgreSQL, quelle que soit la valeur de app.current_org_id.
 */
export async function withTenantScope<T>(
  connectionString: string,
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });
  try {
    return await client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
      return fn(tx);
    });
  } finally {
    await client.$disconnect();
  }
}

/**
 * Multi-tenant Phase 2 (2026-08-20, premier rollout applicatif) — variante de
 * withTenantScope pensee pour les server actions : prend directement
 * l'organizationId de la session NextAuth (session.user.organizationId) et
 * lit la connexion scopee depuis DATABASE_URL_TENANT_SCOPED (role Postgres
 * non-proprietaire, voir scripts/setup-production-tenant-role.ts et
 * scripts/setup-local-rls-test-role.ts en local).
 *
 * Client mis en cache sur `globalThis` (meme pattern que `prisma` dans
 * src/lib/prisma.ts) plutot que `new PrismaClient()` a chaque appel : ce
 * dernier cree un nouveau `pg.Pool` (voir @prisma/adapter-pg) a chaque
 * invocation puis le detruit juste apres — tolerable pour une action
 * occasionnelle, mais un risque reel de rafale de connexions vers Neon une
 * fois ce mecanisme utilise a la frequence d'un chargement de page (lectures,
 * Phase 2 lot pages) plutot qu'une simple mutation ponctuelle.
 *
 * Repli explicite si organizationId est absent (compte cree avant le
 * rattachement ecrit par les actions, ou avant le backfill initial) :
 * utilise le client Prisma non scope habituel plutot que d'echouer — aucune
 * regression pour ce cas, mais AUCUNE isolation non plus pour cet appel
 * precis. `prisma` (PrismaClient) est structurellement compatible avec
 * Prisma.TransactionClient (memes delegates de modele) ; le cast est sur.
 */
const globalForTenantScopedPrisma = globalThis as unknown as {
  tenantScopedPrisma?: PrismaClient;
};

/**
 * Meme convention que src/lib/prisma.ts, en version paresseuse (la variable
 * DATABASE_URL_TENANT_SCOPED peut legitimement etre absente dans un
 * environnement qui n'appelle jamais withTenantScopedSession avec un
 * organizationId — construire le client au chargement du module planterait
 * tout le process pour rien). Le module ES est deja un singleton par
 * processus : la reassignation sur `globalThis` ne sert qu'a survivre au
 * hot-reload de `next dev`, qui re-evalue ce module sans redemarrer le
 * processus Node — inutile, donc evitee, en production.
 */
let tenantScopedClient: PrismaClient | undefined = globalForTenantScopedPrisma.tenantScopedPrisma;

function getTenantScopedClient(connectionString: string): PrismaClient {
  if (!tenantScopedClient) {
    tenantScopedClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    if (process.env.NODE_ENV !== "production") {
      globalForTenantScopedPrisma.tenantScopedPrisma = tenantScopedClient;
    }
  }
  return tenantScopedClient;
}

export async function withTenantScopedSession<T>(
  organizationId: string | null | undefined,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!organizationId) {
    return fn(prisma as unknown as Prisma.TransactionClient);
  }
  const connectionString = process.env.DATABASE_URL_TENANT_SCOPED;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_TENANT_SCOPED non configuré — isolation multi-tenant indisponible pour cette action."
    );
  }
  const client = getTenantScopedClient(connectionString);
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
    return fn(tx);
  });
}
