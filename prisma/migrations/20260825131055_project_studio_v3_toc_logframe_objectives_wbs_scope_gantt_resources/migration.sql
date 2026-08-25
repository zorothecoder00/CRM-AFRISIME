-- CreateEnum
CREATE TYPE "TheoryOfChangeLevel" AS ENUM ('INPUT', 'ACTIVITE', 'OUTPUT', 'OUTCOME', 'IMPACT');

-- CreateEnum
CREATE TYPE "LogframeLevel" AS ENUM ('IMPACT', 'OUTCOME', 'OUTPUT', 'ACTIVITES');

-- CreateEnum
CREATE TYPE "ObjectiveNiveau" AS ENUM ('GENERAL', 'SPECIFIQUE', 'RESULTAT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DependencyType" ADD VALUE 'FINISH_TO_START';
ALTER TYPE "DependencyType" ADD VALUE 'START_TO_START';
ALTER TYPE "DependencyType" ADD VALUE 'FINISH_TO_FINISH';
ALTER TYPE "DependencyType" ADD VALUE 'START_TO_FINISH';

-- AlterTable
ALTER TABLE "Objective" ADD COLUMN     "niveau" "ObjectiveNiveau",
ADD COLUMN     "smartAtteignable" BOOLEAN,
ADD COLUMN     "smartMesurable" BOOLEAN,
ADD COLUMN     "smartPertinent" BOOLEAN,
ADD COLUMN     "smartSpecifique" BOOLEAN,
ADD COLUMN     "smartTemporel" BOOLEAN;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "contraintes" TEXT,
ADD COLUMN     "criteresReussite" TEXT,
ADD COLUMN     "gouvernance" TEXT,
ADD COLUMN     "limites" TEXT,
ADD COLUMN     "perimetreExclus" TEXT,
ADD COLUMN     "perimetreInclus" TEXT;

-- AlterTable
ALTER TABLE "ProjectDeliverable" ADD COLUMN     "objectiveId" TEXT,
ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "ProjectMilestone" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "ProjectResource" ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "TaskDependency" ALTER COLUMN "type" SET DEFAULT 'FINISH_TO_START';

-- CreateTable
CREATE TABLE "TheoryOfChangeNode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "niveau" "TheoryOfChangeLevel" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "hypotheses" TEXT,
    "risques" TEXT,
    "conditions" TEXT,
    "indicateurs" TEXT,
    "sourcesVerification" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TheoryOfChangeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogframeRow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "niveau" "LogframeLevel" NOT NULL,
    "resultats" TEXT,
    "indicateurs" TEXT,
    "sources" TEXT,
    "hypotheses" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogframeRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TheoryOfChangeNode_projectId_idx" ON "TheoryOfChangeNode"("projectId");

-- CreateIndex
CREATE INDEX "LogframeRow_projectId_idx" ON "LogframeRow"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_objectiveId_idx" ON "ProjectDeliverable"("objectiveId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_sectionId_idx" ON "ProjectDeliverable"("sectionId");

-- CreateIndex
CREATE INDEX "ProjectResource_taskId_idx" ON "ProjectResource"("taskId");

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResource" ADD CONSTRAINT "ProjectResource_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryOfChangeNode" ADD CONSTRAINT "TheoryOfChangeNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryOfChangeNode" ADD CONSTRAINT "TheoryOfChangeNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryOfChangeNode" ADD CONSTRAINT "TheoryOfChangeNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogframeRow" ADD CONSTRAINT "LogframeRow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogframeRow" ADD CONSTRAINT "LogframeRow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogframeRow" ADD CONSTRAINT "LogframeRow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
