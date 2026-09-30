/**
 * Donnees de demonstration pour les captures du guide d'utilisation (/guide) :
 * organisations, contacts, opportunites CRM, et un contact externe relie au
 * projet de demo avec un acces portail active. Idempotent (ids fixes, upsert).
 *
 * LOCAL UNIQUEMENT — refuse de tourner si DATABASE_URL ne pointe pas sur
 * localhost (meme principe que "never seed production" : le compte portail
 * cree ici a un mot de passe public).
 *
 * Usage : npx tsx scripts/seed-guide-demo.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const DEMO_PROJECT_ID = "demo-project-refonte-site";
export const GUIDE_PORTAL_EMAIL = "afi.amegah@demo.local";
export const GUIDE_PORTAL_PASSWORD = "Password123!";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error("seed-guide-demo : DATABASE_URL ne pointe pas sur une base locale — abandon.");
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@afriflow.local" } });
  const dg = await prisma.user.findUniqueOrThrow({ where: { email: "dg@afriflow.local" } });
  await prisma.project.findUniqueOrThrow({ where: { id: DEMO_PROJECT_ID } });
  const orgId = admin.organizationId;

  const organizations = [
    { id: "guide-org-kekeli", nom: "Fondation Kekeli", type: "INSTITUTION" as const, secteur: "Développement communautaire" },
    { id: "guide-org-sahel", nom: "Sahel Agritech SARL", type: "ENTREPRISE" as const, secteur: "Agro-industrie" },
    { id: "guide-org-lome", nom: "Lomé Distribution", type: "FOURNISSEUR" as const, secteur: "Équipements informatiques" },
    { id: "guide-org-horizon", nom: "Horizon Impact Capital", type: "INVESTISSEUR" as const, secteur: "Investissement à impact" },
  ];
  for (const o of organizations) {
    await prisma.crmOrganization.upsert({
      where: { id: o.id },
      update: {},
      create: { ...o, createdById: dg.id, ownerId: dg.id, platformOrganizationId: orgId },
    });
  }

  const contacts = [
    { id: "guide-contact-afi", prenom: "Afi", nom: "Amegah", email: GUIDE_PORTAL_EMAIL, fonction: "Chargée de programmes", type: "PARTENAIRE" as const, organizationId: "guide-org-kekeli" },
    { id: "guide-contact-kossi", prenom: "Kossi", nom: "Mensah", email: "kossi.mensah@demo.local", fonction: "Directeur commercial", type: "CLIENT" as const, organizationId: "guide-org-sahel" },
    { id: "guide-contact-ama", prenom: "Ama", nom: "Kpodar", email: "ama.kpodar@demo.local", fonction: "Responsable des ventes", type: "FOURNISSEUR" as const, organizationId: "guide-org-lome" },
    { id: "guide-contact-moussa", prenom: "Moussa", nom: "Traoré", email: "moussa.traore@demo.local", fonction: "Chargé d'investissement", type: "INVESTISSEUR" as const, organizationId: "guide-org-horizon" },
  ];
  for (const c of contacts) {
    await prisma.crmContact.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, createdById: dg.id, ownerId: dg.id, platformOrganizationId: orgId },
    });
  }

  const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
  const opportunities = [
    { id: "guide-opp-1", nom: "Plateforme de suivi des coopératives", contactId: "guide-contact-kossi", organizationId: "guide-org-sahel", statut: "NOUVEAU" as const, montantEstime: 4_500_000, probabilite: 20, dateClotureEstimee: inDays(60) },
    { id: "guide-opp-2", nom: "Formation des agents de terrain", contactId: "guide-contact-afi", organizationId: "guide-org-kekeli", statut: "QUALIFICATION" as const, montantEstime: 2_800_000, probabilite: 40, dateClotureEstimee: inDays(45) },
    { id: "guide-opp-3", nom: "Programme d'inclusion numérique", contactId: "guide-contact-moussa", organizationId: "guide-org-horizon", statut: "PROPOSITION" as const, montantEstime: 18_000_000, probabilite: 55, dateClotureEstimee: inDays(30) },
    { id: "guide-opp-4", nom: "Équipement du centre de Kara", contactId: "guide-contact-ama", organizationId: "guide-org-lome", statut: "NEGOCIATION" as const, montantEstime: 7_200_000, probabilite: 75, dateClotureEstimee: inDays(15) },
    { id: "guide-opp-5", nom: "Étude de marché régionale", contactId: "guide-contact-kossi", organizationId: "guide-org-sahel", statut: "GAGNEE" as const, montantEstime: 3_100_000, probabilite: 100, dateClotureEstimee: inDays(-10) },
  ];
  for (const o of opportunities) {
    await prisma.crmOpportunity.upsert({
      where: { id: o.id },
      update: {},
      create: { ...o, ownerId: dg.id, createdById: dg.id, platformOrganizationId: orgId },
    });
  }

  // Partie prenante reliee au projet de demo : c'est ce lien qui autorise
  // le contact a voir le projet dans son portail (portal-authorization.ts).
  await prisma.stakeholder.upsert({
    where: { id: "guide-stakeholder-afi" },
    update: {},
    create: {
      id: "guide-stakeholder-afi",
      nom: "Afi Amegah",
      contactId: "guide-contact-afi",
      organisation: "Fondation Kekeli",
      categorie: "Partenaire",
      influence: "ELEVE",
      interet: "ELEVE",
      createdById: dg.id,
      organizationId: orgId,
    },
  });
  const link = await prisma.stakeholderProject.findFirst({
    where: { stakeholderId: "guide-stakeholder-afi", projectId: DEMO_PROJECT_ID },
  });
  if (!link) {
    await prisma.stakeholderProject.create({
      data: { stakeholderId: "guide-stakeholder-afi", projectId: DEMO_PROJECT_ID, role: "Partenaire financier", organizationId: orgId },
    });
  }

  await prisma.portalAccount.upsert({
    where: { contactId: "guide-contact-afi" },
    update: { isActive: true },
    create: {
      contactId: "guide-contact-afi",
      email: GUIDE_PORTAL_EMAIL,
      passwordHash: await bcrypt.hash(GUIDE_PORTAL_PASSWORD, 10),
      activatedAt: new Date(),
      invitedById: dg.id,
      platformOrganizationId: orgId,
    },
  });

  console.log("Données de démonstration du guide prêtes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
