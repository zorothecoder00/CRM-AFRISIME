-- CreateEnum
CREATE TYPE "ContractStatut" AS ENUM ('ACTIF', 'EXPIRE', 'RESILIE');

-- AlterEnum
ALTER TYPE "AutomationActionType" ADD VALUE 'CREATE_DEADLINE';

-- AlterEnum
ALTER TYPE "AutomationTrigger" ADD VALUE 'CONTRACT_CREATED';

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "deadlineDelaiJours" INTEGER,
ADD COLUMN     "deadlineTitre" TEXT,
ADD COLUMN     "elseRuleId" TEXT;

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "opportunityId" TEXT,
    "organizationId" TEXT,
    "montant" DECIMAL(14,2),
    "dateSignature" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "statut" "ContractStatut" NOT NULL DEFAULT 'ACTIF',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_opportunityId_idx" ON "Contract"("opportunityId");

-- CreateIndex
CREATE INDEX "Contract_organizationId_idx" ON "Contract"("organizationId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CrmOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_elseRuleId_fkey" FOREIGN KEY ("elseRuleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
