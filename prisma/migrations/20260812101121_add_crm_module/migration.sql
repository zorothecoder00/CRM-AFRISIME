-- CreateEnum
CREATE TYPE "CrmOrganizationType" AS ENUM ('ENTREPRISE', 'INSTITUTION', 'PARTENAIRE', 'FOURNISSEUR', 'INVESTISSEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "CrmContactType" AS ENUM ('CLIENT', 'PROSPECT', 'PARTENAIRE', 'FOURNISSEUR', 'CONSULTANT', 'PRESTATAIRE', 'CANDIDAT', 'MEMBRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CrmOpportunityStatus" AS ENUM ('NOUVEAU', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'GAGNEE', 'PERDUE');

-- CreateEnum
CREATE TYPE "CrmInteractionType" AS ENUM ('EMAIL', 'APPEL', 'WHATSAPP', 'REUNION', 'VISITE', 'NOTE');

-- CreateTable
CREATE TABLE "CrmOrganization" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "CrmOrganizationType" NOT NULL DEFAULT 'ENTREPRISE',
    "secteur" TEXT,
    "siteWeb" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "fonction" TEXT,
    "type" "CrmContactType" NOT NULL DEFAULT 'PROSPECT',
    "source" TEXT,
    "organizationId" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOpportunity" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contactId" TEXT,
    "organizationId" TEXT,
    "statut" "CrmOpportunityStatus" NOT NULL DEFAULT 'NOUVEAU',
    "montantEstime" DECIMAL(14,2),
    "probabilite" INTEGER,
    "source" TEXT,
    "dateClotureEstimee" TIMESTAMP(3),
    "raisonPerte" TEXT,
    "notes" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmInteraction" (
    "id" TEXT NOT NULL,
    "type" "CrmInteractionType" NOT NULL,
    "contenu" TEXT NOT NULL,
    "dateInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT,
    "organizationId" TEXT,
    "opportunityId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmOrganization_ownerId_idx" ON "CrmOrganization"("ownerId");

-- CreateIndex
CREATE INDEX "CrmOrganization_nom_idx" ON "CrmOrganization"("nom");

-- CreateIndex
CREATE INDEX "CrmContact_organizationId_idx" ON "CrmContact"("organizationId");

-- CreateIndex
CREATE INDEX "CrmContact_ownerId_idx" ON "CrmContact"("ownerId");

-- CreateIndex
CREATE INDEX "CrmContact_nom_idx" ON "CrmContact"("nom");

-- CreateIndex
CREATE INDEX "CrmOpportunity_contactId_idx" ON "CrmOpportunity"("contactId");

-- CreateIndex
CREATE INDEX "CrmOpportunity_organizationId_idx" ON "CrmOpportunity"("organizationId");

-- CreateIndex
CREATE INDEX "CrmOpportunity_ownerId_idx" ON "CrmOpportunity"("ownerId");

-- CreateIndex
CREATE INDEX "CrmOpportunity_statut_idx" ON "CrmOpportunity"("statut");

-- CreateIndex
CREATE INDEX "CrmInteraction_contactId_idx" ON "CrmInteraction"("contactId");

-- CreateIndex
CREATE INDEX "CrmInteraction_organizationId_idx" ON "CrmInteraction"("organizationId");

-- CreateIndex
CREATE INDEX "CrmInteraction_opportunityId_idx" ON "CrmInteraction"("opportunityId");

-- AddForeignKey
ALTER TABLE "CrmOrganization" ADD CONSTRAINT "CrmOrganization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOrganization" ADD CONSTRAINT "CrmOrganization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CrmOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CrmOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInteraction" ADD CONSTRAINT "CrmInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInteraction" ADD CONSTRAINT "CrmInteraction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CrmOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInteraction" ADD CONSTRAINT "CrmInteraction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInteraction" ADD CONSTRAINT "CrmInteraction_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
