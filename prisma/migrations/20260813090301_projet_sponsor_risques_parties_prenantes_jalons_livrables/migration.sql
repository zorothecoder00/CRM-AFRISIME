-- CreateEnum
CREATE TYPE "RiskProbability" AS ENUM ('FAIBLE', 'MOYENNE', 'ELEVEE');

-- CreateEnum
CREATE TYPE "RiskImpact" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIE', 'EN_TRAITEMENT', 'MAITRISE', 'SURVENU', 'CLOS');

-- CreateEnum
CREATE TYPE "StakeholderNiveau" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('A_VENIR', 'ATTEINT', 'MANQUE');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('A_FAIRE', 'EN_COURS', 'SOUMIS', 'VALIDE', 'REJETE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "sponsorId" TEXT;

-- CreateTable
CREATE TABLE "ProjectRisk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "probabilite" "RiskProbability" NOT NULL DEFAULT 'MOYENNE',
    "impact" "RiskImpact" NOT NULL DEFAULT 'MOYEN',
    "statut" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIE',
    "planMitigation" TEXT,
    "responsableId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStakeholder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" TEXT,
    "userId" TEXT,
    "contactId" TEXT,
    "influence" "StakeholderNiveau" NOT NULL DEFAULT 'MOYEN',
    "interet" "StakeholderNiveau" NOT NULL DEFAULT 'MOYEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "dateCible" TIMESTAMP(3) NOT NULL,
    "statut" "MilestoneStatus" NOT NULL DEFAULT 'A_VENIR',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDeliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "statut" "DeliverableStatus" NOT NULL DEFAULT 'A_FAIRE',
    "echeance" TIMESTAMP(3),
    "responsableId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRisk_projectId_idx" ON "ProjectRisk"("projectId");

-- CreateIndex
CREATE INDEX "ProjectStakeholder_projectId_idx" ON "ProjectStakeholder"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_projectId_idx" ON "ProjectDeliverable"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStakeholder" ADD CONSTRAINT "ProjectStakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStakeholder" ADD CONSTRAINT "ProjectStakeholder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStakeholder" ADD CONSTRAINT "ProjectStakeholder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
