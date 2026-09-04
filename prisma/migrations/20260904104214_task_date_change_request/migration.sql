-- CreateEnum
CREATE TYPE "TaskDateChangeRequestStatus" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DEMANDE_REPORT_ECHEANCE';
ALTER TYPE "NotificationType" ADD VALUE 'DEMANDE_REPORT_ECHEANCE_DECISION';

-- CreateTable
CREATE TABLE "TaskDateChangeRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "taskId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "currentDateDebut" TIMESTAMP(3),
    "requestedDateDebut" TIMESTAMP(3),
    "currentEcheance" TIMESTAMP(3),
    "requestedEcheance" TIMESTAMP(3),
    "motif" TEXT NOT NULL,
    "statut" "TaskDateChangeRequestStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "decidedById" TEXT,
    "decisionMotif" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskDateChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskDateChangeRequest_taskId_idx" ON "TaskDateChangeRequest"("taskId");

-- CreateIndex
CREATE INDEX "TaskDateChangeRequest_requestedById_idx" ON "TaskDateChangeRequest"("requestedById");

-- CreateIndex
CREATE INDEX "TaskDateChangeRequest_statut_idx" ON "TaskDateChangeRequest"("statut");

-- AddForeignKey
ALTER TABLE "TaskDateChangeRequest" ADD CONSTRAINT "TaskDateChangeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDateChangeRequest" ADD CONSTRAINT "TaskDateChangeRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDateChangeRequest" ADD CONSTRAINT "TaskDateChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDateChangeRequest" ADD CONSTRAINT "TaskDateChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
