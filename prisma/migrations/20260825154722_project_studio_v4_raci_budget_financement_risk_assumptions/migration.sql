-- CreateEnum
CREATE TYPE "FinancementSource" AS ENUM ('FONDS_PROPRES', 'SUBVENTION', 'PRET', 'INVESTISSEMENT', 'BAILLEUR', 'PARTENAIRE', 'SPONSORING', 'CONTRIBUTION_NATURE');

-- CreateEnum
CREATE TYPE "RaciRole" AS ENUM ('RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED');

-- CreateEnum
CREATE TYPE "BudgetCategorie" AS ENUM ('PERSONNEL', 'EQUIPEMENT', 'TRANSPORT', 'FORMATION', 'COMMUNICATION', 'PRESTATIONS', 'ACHATS', 'LOGISTIQUE', 'FONCTIONNEMENT', 'IMPREVUS');

-- CreateEnum
CREATE TYPE "AssumptionStatus" AS ENUM ('VALIDE', 'INCERTAINE', 'INVALIDEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FinancementStatut" ADD VALUE 'IDENTIFIE';
ALTER TYPE "FinancementStatut" ADD VALUE 'SOLLICITE';
ALTER TYPE "FinancementStatut" ADD VALUE 'APPROUVE';

-- AlterTable
ALTER TABLE "Financement" ADD COLUMN     "conditions" TEXT,
ADD COLUMN     "convention" TEXT,
ADD COLUMN     "indicateursImposes" TEXT,
ADD COLUMN     "livrablesRequis" TEXT,
ADD COLUMN     "periodeDebut" TIMESTAMP(3),
ADD COLUMN     "periodeFin" TIMESTAMP(3),
ADD COLUMN     "rapportsRequis" TEXT,
ADD COLUMN     "source" "FinancementSource";

-- AlterTable
ALTER TABLE "ProjectRisk" ADD COLUMN     "categorie" TEXT,
ADD COLUMN     "planContingence" TEXT;

-- AlterTable
ALTER TABLE "ProjectSection" ADD COLUMN     "theoryOfChangeNodeId" TEXT;

-- AlterTable
ALTER TABLE "TheoryOfChangeNode" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "RaciAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "sectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RaciRole" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaciAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "sectionId" TEXT,
    "categorie" "BudgetCategorie" NOT NULL,
    "libelle" TEXT NOT NULL,
    "montantPrevu" DECIMAL(14,2) NOT NULL,
    "montantEngage" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingOpportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT,
    "bailleur" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "budgetDisponible" DECIMAL(14,2),
    "paysEligibles" TEXT,
    "secteurs" TEXT,
    "beneficiaires" TEXT,
    "criteres" TEXT,
    "documents" TEXT,
    "exigences" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssumption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "hypothese" TEXT NOT NULL,
    "statut" "AssumptionStatus" NOT NULL DEFAULT 'INCERTAINE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaciAssignment_sectionId_idx" ON "RaciAssignment"("sectionId");

-- CreateIndex
CREATE INDEX "RaciAssignment_userId_idx" ON "RaciAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RaciAssignment_sectionId_userId_role_key" ON "RaciAssignment"("sectionId", "userId", "role");

-- CreateIndex
CREATE INDEX "BudgetLine_projectId_idx" ON "BudgetLine"("projectId");

-- CreateIndex
CREATE INDEX "BudgetLine_sectionId_idx" ON "BudgetLine"("sectionId");

-- CreateIndex
CREATE INDEX "FundingOpportunity_projectId_idx" ON "FundingOpportunity"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAssumption_projectId_idx" ON "ProjectAssumption"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSection_theoryOfChangeNodeId_idx" ON "ProjectSection"("theoryOfChangeNodeId");

-- CreateIndex
CREATE INDEX "TheoryOfChangeNode_parentId_idx" ON "TheoryOfChangeNode"("parentId");

-- AddForeignKey
ALTER TABLE "ProjectSection" ADD CONSTRAINT "ProjectSection_theoryOfChangeNodeId_fkey" FOREIGN KEY ("theoryOfChangeNodeId") REFERENCES "TheoryOfChangeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryOfChangeNode" ADD CONSTRAINT "TheoryOfChangeNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TheoryOfChangeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaciAssignment" ADD CONSTRAINT "RaciAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaciAssignment" ADD CONSTRAINT "RaciAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaciAssignment" ADD CONSTRAINT "RaciAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaciAssignment" ADD CONSTRAINT "RaciAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingOpportunity" ADD CONSTRAINT "FundingOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingOpportunity" ADD CONSTRAINT "FundingOpportunity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingOpportunity" ADD CONSTRAINT "FundingOpportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssumption" ADD CONSTRAINT "ProjectAssumption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssumption" ADD CONSTRAINT "ProjectAssumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssumption" ADD CONSTRAINT "ProjectAssumption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
