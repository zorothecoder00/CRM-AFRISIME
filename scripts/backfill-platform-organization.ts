import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Multi-tenant Phase 1 (V3.0 §27, plan Phase 1 + lots 2-7) — rattache toutes
 * les lignes existantes (sans organizationId) des modeles couverts par le
 * retrofit multi-tenant a une PlatformOrganization "AfriSime", conformement
 * a la decision actee le 2026-08-20 : les donnees actuelles de ce
 * deploiement deviennent l'organisation n°1. Idempotent (upsert sur le slug
 * + where organizationId IS NULL) — relancer ce script ne cree pas de
 * doublon et ne re-rattache pas des lignes deja assignees a une autre
 * organisation.
 *
 * Liste MODELS etendue a chaque nouveau lot — voir prisma/schema.prisma
 * pour l'etat courant des modeles couverts.
 *
 * Usage :
 *   DATABASE_URL="<url>" npx tsx scripts/backfill-platform-organization.ts
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MODELS = [
  { label: "Utilisateurs", client: prisma.user },
  { label: "Départements", client: prisma.department },
  { label: "Équipes", client: prisma.team },
  { label: "Projets", client: prisma.project },
  { label: "Tâches", client: prisma.task },
  { label: "Phases/lots", client: prisma.projectSection },
  { label: "Documents", client: prisma.document },
  { label: "Réunions", client: prisma.meeting },
  { label: "Dossiers de documents", client: prisma.documentFolder },
  { label: "Tableaux blancs", client: prisma.whiteboard },
  { label: "Membres de projet", client: prisma.projectMember },
  { label: "Risques projet", client: prisma.projectRisk },
  { label: "Jalons", client: prisma.projectMilestone },
  { label: "Livrables", client: prisma.projectDeliverable },
  { label: "Ressources projet", client: prisma.projectResource },
  { label: "Commentaires de section", client: prisma.sectionComment },
  { label: "Affectations de tâche", client: prisma.taskAssignee },
  { label: "Éléments de checklist", client: prisma.checklistItem },
  { label: "Commentaires de tâche", client: prisma.taskComment },
  { label: "Dépendances de tâche", client: prisma.taskDependency },
  { label: "Accès document", client: prisma.documentAccess },
  { label: "Versions de document", client: prisma.documentVersion },
  { label: "Participants de réunion", client: prisma.meetingParticipant },
  { label: "Décisions de réunion", client: prisma.meetingDecision },
  { label: "Participants externes de réunion", client: prisma.meetingExternalParticipant },
] as const;

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

  console.log(`PlatformOrganization "AfriSime" (id: ${afrisime.id})`);

  for (const { label, client } of MODELS) {
    // @ts-expect-error -- updateMany existe sur tous les delegates Prisma listes ci-dessus
    const result = await client.updateMany({
      where: { organizationId: null },
      data: { organizationId: afrisime.id },
    });
    console.log(`  ${label} rattachés : ${result.count}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
