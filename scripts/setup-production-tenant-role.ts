import "dotenv/config";
import crypto from "node:crypto";
import { Client } from "pg";
import { COVERED_TABLES } from "./lib/multi-tenant-tables";

/**
 * Multi-tenant Phase 2 (2026-08-20) — cree sur Neon PRODUCTION le role
 * Postgres non-proprietaire que withTenantScope (src/lib/tenant-scoped-prisma.ts)
 * doit utiliser pour que RLS isole reellement les donnees : le role
 * proprietaire des tables (celui de DATABASE_URL, utilise par le reste de
 * l'app) reste exempte de RLS par construction PostgreSQL, avec ou sans
 * politiques — voir le commentaire sur PlatformOrganization dans
 * schema.prisma. Miroir de setup-local-rls-test-role.ts, mais pour un usage
 * applicatif reel (pas seulement les tests d'integration).
 *
 * Idempotent : si le role existe deja, son mot de passe est regenere (ALTER
 * ROLE) et les droits re-accordes — relancer ce script est sans danger,
 * mais INVALIDE toute chaine de connexion deja distribuee (mot de passe
 * change a chaque execution).
 *
 * Usage (contre Neon production, DATABASE_URL doit pointer sur le role
 * proprietaire) :
 *   set -a; source <(grep '^DATABASE_URL=' .env.production.bak); set +a
 *   npx tsx scripts/setup-production-tenant-role.ts
 *
 * La chaine de connexion generee est affichee UNE SEULE FOIS en sortie —
 * a copier immediatement dans le secret de la plateforme de deploiement
 * (ex. Vercel) sous un nom distinct de DATABASE_URL (ex.
 * DATABASE_URL_TENANT_SCOPED). Ne jamais la committer.
 */

const ROLE_NAME = "afriflow_app_tenant_scoped";

function assertProductionUrl(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error("DATABASE_URL non defini.");
  }
  if (!url.includes("neon.tech")) {
    throw new Error(
      "DATABASE_URL ne semble pas pointer vers Neon (attendu: host *.neon.tech). " +
        "Ce script est reserve a la production — verifiez la source avant de relancer."
    );
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  assertProductionUrl(databaseUrl);

  const url = new URL(databaseUrl);
  const password = crypto.randomBytes(24).toString("base64url");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const { rows } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [ROLE_NAME]);
  if (rows.length === 0) {
    await client.query(`CREATE ROLE ${ROLE_NAME} LOGIN PASSWORD '${password}'`);
    console.log(`Rôle "${ROLE_NAME}" créé.`);
  } else {
    await client.query(`ALTER ROLE ${ROLE_NAME} LOGIN PASSWORD '${password}'`);
    console.log(`Rôle "${ROLE_NAME}" déjà présent — mot de passe régénéré.`);
  }

  // Acces minimal : lecture/ecriture sur les modeles couverts par le
  // retrofit multi-tenant, rien d'autre. Ce role sert UNIQUEMENT aux appels
  // passant par withTenantScope — jamais utilise comme DATABASE_URL
  // principal (il ne peut pas creer/modifier de tables, migrer, etc.).
  await client.query(`GRANT USAGE ON SCHEMA public TO ${ROLE_NAME}`);
  const tableList = COVERED_TABLES.map((t) => `"${t}"`).join(", ");
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${tableList} TO ${ROLE_NAME}`);

  console.log(`Droits accordés sur ${COVERED_TABLES.length} tables.`);

  const scopedUrl = new URL(url.toString());
  scopedUrl.username = ROLE_NAME;
  scopedUrl.password = password;

  console.log("\n--- Chaîne de connexion (à copier maintenant, non réaffichée) ---");
  console.log(scopedUrl.toString());
  console.log("--- Ajoutez-la comme secret DATABASE_URL_TENANT_SCOPED sur votre plateforme de déploiement ---\n");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
