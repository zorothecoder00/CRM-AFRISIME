-- CreateEnum
CREATE TYPE "BeneficiaireType" AS ENUM ('DIRECT', 'INDIRECT');

-- CreateEnum
CREATE TYPE "ProblemTreeNodeType" AS ENUM ('CONSEQUENCE', 'PROBLEME_CENTRAL', 'CAUSE_DIRECTE', 'CAUSE_PROFONDE');

-- CreateEnum
CREATE TYPE "SolutionTreeNodeType" AS ENUM ('OBJECTIF_GLOBAL', 'SOLUTION', 'RESULTAT_ATTENDU');

-- AlterTable
ALTER TABLE "Beneficiaire" ADD COLUMN     "besoins" TEXT,
ADD COLUMN     "caracteristiques" TEXT,
ADD COLUMN     "criteresSelection" TEXT,
ADD COLUMN     "localisation" TEXT,
ADD COLUMN     "nombre" INTEGER,
ADD COLUMN     "type" "BeneficiaireType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "vulnerabilites" TEXT;

-- AlterTable
ALTER TABLE "Stakeholder" ADD COLUMN     "attentes" TEXT,
ADD COLUMN     "categorie" TEXT,
ADD COLUMN     "organisation" TEXT,
ADD COLUMN     "strategieEngagement" TEXT;

-- CreateTable
CREATE TABLE "ProjectDiagnostic" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "analyseContexte" TEXT,
    "analyseBesoins" TEXT,
    "analyseCauses" TEXT,
    "analyseConsequences" TEXT,
    "donneesStatistiques" TEXT,
    "enquetes" TEXT,
    "consultations" TEXT,
    "etudesExistantes" TEXT,
    "analyseDocumentaire" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDiagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTreeNode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "ProblemTreeNodeType" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "sources" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemTreeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionTreeNode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "problemNodeId" TEXT,
    "parentId" TEXT,
    "type" "SolutionTreeNodeType" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionTreeNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDiagnostic_projectId_key" ON "ProjectDiagnostic"("projectId");

-- CreateIndex
CREATE INDEX "ProblemTreeNode_projectId_idx" ON "ProblemTreeNode"("projectId");

-- CreateIndex
CREATE INDEX "ProblemTreeNode_parentId_idx" ON "ProblemTreeNode"("parentId");

-- CreateIndex
CREATE INDEX "SolutionTreeNode_projectId_idx" ON "SolutionTreeNode"("projectId");

-- CreateIndex
CREATE INDEX "SolutionTreeNode_parentId_idx" ON "SolutionTreeNode"("parentId");

-- AddForeignKey
ALTER TABLE "ProjectDiagnostic" ADD CONSTRAINT "ProjectDiagnostic_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDiagnostic" ADD CONSTRAINT "ProjectDiagnostic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDiagnostic" ADD CONSTRAINT "ProjectDiagnostic_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNode" ADD CONSTRAINT "ProblemTreeNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNode" ADD CONSTRAINT "ProblemTreeNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNode" ADD CONSTRAINT "ProblemTreeNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProblemTreeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNode" ADD CONSTRAINT "ProblemTreeNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionTreeNode" ADD CONSTRAINT "SolutionTreeNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionTreeNode" ADD CONSTRAINT "SolutionTreeNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionTreeNode" ADD CONSTRAINT "SolutionTreeNode_problemNodeId_fkey" FOREIGN KEY ("problemNodeId") REFERENCES "ProblemTreeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionTreeNode" ADD CONSTRAINT "SolutionTreeNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SolutionTreeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionTreeNode" ADD CONSTRAINT "SolutionTreeNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
