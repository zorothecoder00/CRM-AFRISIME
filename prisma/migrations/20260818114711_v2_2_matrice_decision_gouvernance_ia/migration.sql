-- CreateEnum
CREATE TYPE "AiGovernanceNiveau" AS ENUM ('SUGGESTION', 'VALIDATION', 'AUTOMATISATION');

-- CreateEnum
CREATE TYPE "PendingAiActionStatut" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');

-- CreateEnum
CREATE TYPE "NiveauQualitatif" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE');

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "niveauIA" "AiGovernanceNiveau" NOT NULL DEFAULT 'AUTOMATISATION';

-- CreateTable
CREATE TABLE "PendingAiAction" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "projectId" TEXT,
    "conditionData" JSONB,
    "statut" "PendingAiActionStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "motifRejet" TEXT,

    CONSTRAINT "PendingAiAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionMatrix" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contexte" TEXT,
    "projectId" TEXT,
    "poidsCout" INTEGER NOT NULL DEFAULT 50,
    "poidsDelai" INTEGER NOT NULL DEFAULT 50,
    "poidsRisque" INTEGER NOT NULL DEFAULT 50,
    "poidsImpact" INTEGER NOT NULL DEFAULT 50,
    "poidsRessources" INTEGER NOT NULL DEFAULT 50,
    "poidsRoi" INTEGER NOT NULL DEFAULT 50,
    "poidsFaisabilite" INTEGER NOT NULL DEFAULT 50,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionOption" (
    "id" TEXT NOT NULL,
    "matrixId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "cout" DECIMAL(14,2),
    "delaiJours" INTEGER,
    "risque" "NiveauQualitatif" NOT NULL DEFAULT 'MOYEN',
    "impact" "NiveauQualitatif" NOT NULL DEFAULT 'MOYEN',
    "ressources" DECIMAL(10,2),
    "roiPercent" DECIMAL(6,2),
    "faisabilite" "NiveauQualitatif" NOT NULL DEFAULT 'MOYEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingAiAction_ruleId_idx" ON "PendingAiAction"("ruleId");

-- CreateIndex
CREATE INDEX "PendingAiAction_statut_idx" ON "PendingAiAction"("statut");

-- CreateIndex
CREATE INDEX "DecisionMatrix_projectId_idx" ON "DecisionMatrix"("projectId");

-- CreateIndex
CREATE INDEX "DecisionOption_matrixId_idx" ON "DecisionOption"("matrixId");

-- AddForeignKey
ALTER TABLE "PendingAiAction" ADD CONSTRAINT "PendingAiAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAiAction" ADD CONSTRAINT "PendingAiAction_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMatrix" ADD CONSTRAINT "DecisionMatrix_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMatrix" ADD CONSTRAINT "DecisionMatrix_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionOption" ADD CONSTRAINT "DecisionOption_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "DecisionMatrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;
