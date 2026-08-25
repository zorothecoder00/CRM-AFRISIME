-- CreateEnum
CREATE TYPE "ProjectChangeRequestStatus" AS ENUM ('DEMANDE', 'APPROUVE', 'REJETE', 'MODIFICATION_DEMANDEE');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('BESOIN_IDENTIFIE', 'EN_COURS', 'COMMANDE', 'LIVRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "ContractPaymentStatus" AS ENUM ('PREVU', 'PAYE', 'EN_RETARD');

-- AlterEnum
ALTER TYPE "QualityDocumentType" ADD VALUE 'PLAN_QUALITE';

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "actionCorrective" TEXT,
ADD COLUMN     "impact" TEXT;

-- AlterTable
ALTER TABLE "MeetingDecision" ADD COLUMN     "impact" TEXT;

-- AlterTable
ALTER TABLE "ProjectDeliverable" ADD COLUMN     "contractId" TEXT;

-- AlterTable
ALTER TABLE "QualityControl" ADD COLUMN     "actionCorrective" TEXT,
ADD COLUMN     "deliverableId" TEXT,
ADD COLUMN     "nonConformite" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "responsableId" TEXT;

-- AlterTable
ALTER TABLE "QualityDocument" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "ProjectChangeRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "budgetPropose" DECIMAL(14,2),
    "dateFinProposee" TIMESTAMP(3),
    "impactRessources" TEXT,
    "impactRisques" TEXT,
    "impactResultats" TEXT,
    "statut" "ProjectChangeRequestStatus" NOT NULL DEFAULT 'DEMANDE',
    "demandeParId" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "commentaireDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "besoin" TEXT NOT NULL,
    "specifications" TEXT,
    "quantite" DECIMAL(12,2),
    "budget" DECIMAL(14,2),
    "fournisseurId" TEXT,
    "methodeAchat" TEXT,
    "echeance" TIMESTAMP(3),
    "statut" "ProcurementStatus" NOT NULL DEFAULT 'BESOIN_IDENTIFIE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "montant" DECIMAL(14,2),
    "dateSignature" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "statut" "ContractStatut" NOT NULL DEFAULT 'ACTIF',
    "evaluationNote" INTEGER,
    "evaluationCommentaire" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContractPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "contractId" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "datePaiement" TIMESTAMP(3),
    "statut" "ContractPaymentStatus" NOT NULL DEFAULT 'PREVU',
    "reference" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectContractPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationPlanEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "stakeholderId" TEXT,
    "public" TEXT NOT NULL,
    "message" TEXT,
    "canal" TEXT,
    "frequence" TEXT,
    "responsableId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationPlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectChangeRequest_projectId_idx" ON "ProjectChangeRequest"("projectId");

-- CreateIndex
CREATE INDEX "ProcurementItem_projectId_idx" ON "ProcurementItem"("projectId");

-- CreateIndex
CREATE INDEX "ProcurementItem_fournisseurId_idx" ON "ProcurementItem"("fournisseurId");

-- CreateIndex
CREATE INDEX "ProjectContract_projectId_idx" ON "ProjectContract"("projectId");

-- CreateIndex
CREATE INDEX "ProjectContract_fournisseurId_idx" ON "ProjectContract"("fournisseurId");

-- CreateIndex
CREATE INDEX "ProjectContractPayment_contractId_idx" ON "ProjectContractPayment"("contractId");

-- CreateIndex
CREATE INDEX "CommunicationPlanEntry_projectId_idx" ON "CommunicationPlanEntry"("projectId");

-- CreateIndex
CREATE INDEX "CommunicationPlanEntry_stakeholderId_idx" ON "CommunicationPlanEntry"("stakeholderId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_contractId_idx" ON "ProjectDeliverable"("contractId");

-- CreateIndex
CREATE INDEX "QualityControl_projectId_idx" ON "QualityControl"("projectId");

-- CreateIndex
CREATE INDEX "QualityControl_deliverableId_idx" ON "QualityControl"("deliverableId");

-- CreateIndex
CREATE INDEX "QualityDocument_projectId_idx" ON "QualityDocument"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ProjectContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityDocument" ADD CONSTRAINT "QualityDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "ProjectDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChangeRequest" ADD CONSTRAINT "ProjectChangeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChangeRequest" ADD CONSTRAINT "ProjectChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChangeRequest" ADD CONSTRAINT "ProjectChangeRequest_demandeParId_fkey" FOREIGN KEY ("demandeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChangeRequest" ADD CONSTRAINT "ProjectChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementItem" ADD CONSTRAINT "ProcurementItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementItem" ADD CONSTRAINT "ProcurementItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementItem" ADD CONSTRAINT "ProcurementItem_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "CrmOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementItem" ADD CONSTRAINT "ProcurementItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "CrmOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractPayment" ADD CONSTRAINT "ProjectContractPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractPayment" ADD CONSTRAINT "ProjectContractPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ProjectContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractPayment" ADD CONSTRAINT "ProjectContractPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPlanEntry" ADD CONSTRAINT "CommunicationPlanEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPlanEntry" ADD CONSTRAINT "CommunicationPlanEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPlanEntry" ADD CONSTRAINT "CommunicationPlanEntry_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPlanEntry" ADD CONSTRAINT "CommunicationPlanEntry_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPlanEntry" ADD CONSTRAINT "CommunicationPlanEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
