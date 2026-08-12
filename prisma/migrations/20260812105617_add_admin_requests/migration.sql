-- CreateEnum
CREATE TYPE "AdminRequestType" AS ENUM ('ACHAT', 'MISSION', 'DECAISSEMENT', 'MATERIEL', 'AUTORISATION', 'RECRUTEMENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "AdminRequestStatus" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REJETEE');

-- AlterEnum
ALTER TYPE "ValidationEntityType" ADD VALUE 'ADMIN_REQUEST';

-- CreateTable
CREATE TABLE "AdminRequest" (
    "id" TEXT NOT NULL,
    "type" "AdminRequestType" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "montant" DECIMAL(14,2),
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "demandeurId" TEXT NOT NULL,
    "departmentId" TEXT,
    "statut" "AdminRequestStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRequestValidationRun" (
    "id" TEXT NOT NULL,
    "adminRequestId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "statut" "ValidationRunStatus" NOT NULL DEFAULT 'EN_COURS',
    "currentOrdre" INTEGER NOT NULL DEFAULT 1,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRequestValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRequestApproval" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "statut" "ValidationStepStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "approverId" TEXT,
    "commentaire" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRequestApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminRequest_demandeurId_idx" ON "AdminRequest"("demandeurId");

-- CreateIndex
CREATE INDEX "AdminRequest_statut_idx" ON "AdminRequest"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRequestValidationRun_adminRequestId_key" ON "AdminRequestValidationRun"("adminRequestId");

-- CreateIndex
CREATE INDEX "AdminRequestValidationRun_adminRequestId_idx" ON "AdminRequestValidationRun"("adminRequestId");

-- CreateIndex
CREATE INDEX "AdminRequestApproval_runId_idx" ON "AdminRequestApproval"("runId");

-- CreateIndex
CREATE INDEX "AdminRequestApproval_approverId_idx" ON "AdminRequestApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRequestApproval_runId_stepId_key" ON "AdminRequestApproval"("runId", "stepId");

-- AddForeignKey
ALTER TABLE "AdminRequest" ADD CONSTRAINT "AdminRequest_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequest" ADD CONSTRAINT "AdminRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestValidationRun" ADD CONSTRAINT "AdminRequestValidationRun_adminRequestId_fkey" FOREIGN KEY ("adminRequestId") REFERENCES "AdminRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestValidationRun" ADD CONSTRAINT "AdminRequestValidationRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ValidationWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestValidationRun" ADD CONSTRAINT "AdminRequestValidationRun_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestApproval" ADD CONSTRAINT "AdminRequestApproval_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AdminRequestValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestApproval" ADD CONSTRAINT "AdminRequestApproval_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ValidationWorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestApproval" ADD CONSTRAINT "AdminRequestApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
