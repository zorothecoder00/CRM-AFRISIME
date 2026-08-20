import "dotenv/config";
import { Client } from "pg";

/**
 * Multi-tenant Phase 3 (preuve de concept RLS) — cree un role Postgres LOCAL
 * non-proprietaire des tables, seul moyen de verifier reellement qu'une
 * politique RLS bloque quelque chose : le role utilise par DATABASE_URL
 * (proprietaire des tables, cf. migration enable_rls_user_department) reste
 * exempte de RLS par construction PostgreSQL, avec ou sans ces politiques.
 *
 * Local uniquement — jamais execute contre Neon (la gestion des roles y est
 * cote plateforme, hors-scope ; il n'y a de toute facon qu'une seule
 * organisation reelle en prod aujourd'hui, rien a isoler encore).
 *
 * Usage : npx tsx scripts/setup-local-rls-test-role.ts
 */

const ROLE_NAME = "afriflow_tenant_scoped";
const ROLE_PASSWORD = "afriflow_tenant_scoped_local_test_only";

// Tables couvertes par le retrofit multi-tenant (organizationId + RLS) —
// etendue a chaque nouveau lot, voir prisma/schema.prisma.
const COVERED_TABLES = [
  "User",
  "Department",
  "Team",
  "Project",
  "Task",
  "ProjectSection",
  "Document",
  "Meeting",
  "DocumentFolder",
  "Whiteboard",
  "ProjectMember",
  "ProjectRisk",
  "ProjectMilestone",
  "ProjectDeliverable",
  "ProjectResource",
  "SectionComment",
  "TaskAssignee",
  "ChecklistItem",
  "TaskComment",
  "TaskDependency",
  "DocumentAccess",
  "DocumentVersion",
  "MeetingParticipant",
  "MeetingDecision",
  "MeetingExternalParticipant",
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [ROLE_NAME]);
  if (rows.length === 0) {
    await client.query(`CREATE ROLE ${ROLE_NAME} LOGIN PASSWORD '${ROLE_PASSWORD}'`);
    console.log(`Rôle "${ROLE_NAME}" créé.`);
  } else {
    console.log(`Rôle "${ROLE_NAME}" déjà présent.`);
  }

  // Acces minimal : lecture/ecriture sur les modeles couverts par le POC
  // multi-tenant, rien d'autre — ce role ne sert qu'a prouver l'isolation
  // RLS, pas a faire tourner l'app.
  await client.query(`GRANT USAGE ON SCHEMA public TO ${ROLE_NAME}`);
  const tableList = COVERED_TABLES.map((t) => `"${t}"`).join(", ");
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${tableList} TO ${ROLE_NAME}`);

  console.log(`Droits accordés sur : ${COVERED_TABLES.join("/")}.`);
  console.log(
    `Chaîne de connexion pour les tests : postgresql://${ROLE_NAME}:${ROLE_PASSWORD}@localhost:5432/afriflow?schema=public`
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
