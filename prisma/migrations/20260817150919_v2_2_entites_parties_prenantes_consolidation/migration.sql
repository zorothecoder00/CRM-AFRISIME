/*
  Warnings:

  - You are about to drop the `ProjectStakeholder` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StakeholderPosition" AS ENUM ('FAVORABLE', 'NEUTRE', 'OPPOSANT');

-- DropForeignKey
ALTER TABLE "ProjectStakeholder" DROP CONSTRAINT "ProjectStakeholder_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectStakeholder" DROP CONSTRAINT "ProjectStakeholder_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectStakeholder" DROP CONSTRAINT "ProjectStakeholder_userId_fkey";

-- AlterTable
ALTER TABLE "CrmContact" ADD COLUMN     "entityId" TEXT;

-- AlterTable
ALTER TABLE "CrmOrganization" ADD COLUMN     "entityId" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "entityId" TEXT;

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "userId" TEXT,
    "contactId" TEXT,
    "influence" "StakeholderNiveau" NOT NULL DEFAULT 'MOYEN',
    "interet" "StakeholderNiveau" NOT NULL DEFAULT 'MOYEN',
    "niveauEngagement" "StakeholderNiveau" NOT NULL DEFAULT 'MOYEN',
    "position" "StakeholderPosition",
    "relation" TEXT,
    "responsableId" TEXT,
    "risquesRelationnels" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakeholderProject" (
    "id" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StakeholderProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakeholderCommunication" (
    "id" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" TEXT,
    "resume" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StakeholderCommunication_pkey" PRIMARY KEY ("id")
);

-- DataMigration: transfert ProjectStakeholder -> Stakeholder + StakeholderProject
-- (V2.2 §21 — profil partie prenante multi-projets). Reutilise l'id existant
-- de ProjectStakeholder tel quel comme id de Stakeholder ET comme id de la
-- ligne de liaison StakeholderProject (espaces de cles primaires distincts,
-- pas de collision) : evite d'avoir a generer un id compatible cuid en SQL
-- pur. createdById n'existait pas sur ProjectStakeholder : on retombe sur le
-- responsable du projet (Project.responsableId) a defaut de userId renseigne.
INSERT INTO "Stakeholder" (id, nom, "userId", "contactId", influence, interet, "niveauEngagement", notes, "createdById", "createdAt", "updatedAt")
SELECT ps.id, ps.nom, ps."userId", ps."contactId", ps.influence, ps.interet, ps.influence, ps.notes,
       COALESCE(ps."userId", p."responsableId"), ps."createdAt", ps."createdAt"
FROM "ProjectStakeholder" ps
JOIN "Project" p ON p.id = ps."projectId";

INSERT INTO "StakeholderProject" (id, "stakeholderId", "projectId", role, "createdAt")
SELECT ps.id, ps.id, ps."projectId", ps.role, ps."createdAt"
FROM "ProjectStakeholder" ps;

-- DropTable
DROP TABLE "ProjectStakeholder";

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" TEXT,
    "pays" TEXT,
    "devise" TEXT,
    "fuseauHoraire" TEXT,
    "langue" TEXT,
    "reglementations" TEXT,
    "parametresLocaux" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recurrenceAnnuelle" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stakeholder_userId_idx" ON "Stakeholder"("userId");

-- CreateIndex
CREATE INDEX "Stakeholder_contactId_idx" ON "Stakeholder"("contactId");

-- CreateIndex
CREATE INDEX "Stakeholder_responsableId_idx" ON "Stakeholder"("responsableId");

-- CreateIndex
CREATE INDEX "StakeholderProject_projectId_idx" ON "StakeholderProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StakeholderProject_stakeholderId_projectId_key" ON "StakeholderProject"("stakeholderId", "projectId");

-- CreateIndex
CREATE INDEX "StakeholderCommunication_stakeholderId_date_idx" ON "StakeholderCommunication"("stakeholderId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_code_key" ON "Entity"("code");

-- CreateIndex
CREATE INDEX "Entity_parentId_idx" ON "Entity"("parentId");

-- CreateIndex
CREATE INDEX "Holiday_entityId_idx" ON "Holiday"("entityId");

-- CreateIndex
CREATE INDEX "CrmContact_entityId_idx" ON "CrmContact"("entityId");

-- CreateIndex
CREATE INDEX "CrmOrganization_entityId_idx" ON "CrmOrganization"("entityId");

-- CreateIndex
CREATE INDEX "Department_entityId_idx" ON "Department"("entityId");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeholderProject" ADD CONSTRAINT "StakeholderProject_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeholderProject" ADD CONSTRAINT "StakeholderProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeholderCommunication" ADD CONSTRAINT "StakeholderCommunication_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeholderCommunication" ADD CONSTRAINT "StakeholderCommunication_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOrganization" ADD CONSTRAINT "CrmOrganization_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
