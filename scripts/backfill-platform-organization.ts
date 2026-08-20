import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Multi-tenant Phase 1 (V3.0 §27, plan Phase 1 + lot 2) — rattache toutes
 * les lignes User/Department/Team/Project existantes (sans organizationId)
 * a une PlatformOrganization "AfriSime", conformement a la decision actee
 * le 2026-08-20 : les donnees actuelles de ce deploiement deviennent
 * l'organisation n°1. Idempotent (upsert sur le slug + where organizationId
 * IS NULL) — relancer ce script ne cree pas de doublon et ne re-rattache
 * pas des lignes deja assignees a une autre organisation.
 *
 * Usage :
 *   DATABASE_URL="<url>" npx tsx scripts/backfill-platform-organization.ts
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // N'importe quel utilisateur existant convient comme createdBy — le
  // registre PlatformOrganization exige un createdById mais ne prejuge pas
  // du role de ce createur.
  const anyUser = await prisma.user.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

  const afrisime = await prisma.platformOrganization.upsert({
    where: { slug: "afrisime" },
    update: {},
    create: {
      nom: "AfriSime",
      slug: "afrisime",
      createdById: anyUser.id,
    },
  });

  const [usersResult, departmentsResult, teamsResult, projectsResult] = await Promise.all([
    prisma.user.updateMany({
      where: { organizationId: null },
      data: { organizationId: afrisime.id },
    }),
    prisma.department.updateMany({
      where: { organizationId: null },
      data: { organizationId: afrisime.id },
    }),
    prisma.team.updateMany({
      where: { organizationId: null },
      data: { organizationId: afrisime.id },
    }),
    prisma.project.updateMany({
      where: { organizationId: null },
      data: { organizationId: afrisime.id },
    }),
  ]);

  console.log(`PlatformOrganization "AfriSime" (id: ${afrisime.id})`);
  console.log(`  Utilisateurs rattachés : ${usersResult.count}`);
  console.log(`  Départements rattachés : ${departmentsResult.count}`);
  console.log(`  Équipes rattachées : ${teamsResult.count}`);
  console.log(`  Projets rattachés : ${projectsResult.count}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
