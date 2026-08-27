-- CreateEnum
CREATE TYPE "PersonalPlanningEntryType" AS ENUM ('NOTE', 'INDISPONIBLE', 'RESERVE');

-- CreateEnum
CREATE TYPE "AvailabilityRequestStatus" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DEMANDE_DISPONIBILITE';
ALTER TYPE "NotificationType" ADD VALUE 'DEMANDE_DISPONIBILITE_DECISION';

-- CreateTable
CREATE TABLE "PersonalPlanningEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "notes" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "type" "PersonalPlanningEntryType" NOT NULL DEFAULT 'NOTE',
    "originRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalPlanningEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" "AvailabilityRequestStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalPlanningEntry_originRequestId_key" ON "PersonalPlanningEntry"("originRequestId");

-- CreateIndex
CREATE INDEX "PersonalPlanningEntry_userId_idx" ON "PersonalPlanningEntry"("userId");

-- CreateIndex
CREATE INDEX "PersonalPlanningEntry_dateDebut_idx" ON "PersonalPlanningEntry"("dateDebut");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_targetUserId_idx" ON "AvailabilityRequest"("targetUserId");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_requestedById_idx" ON "AvailabilityRequest"("requestedById");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_statut_idx" ON "AvailabilityRequest"("statut");

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntry" ADD CONSTRAINT "PersonalPlanningEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntry" ADD CONSTRAINT "PersonalPlanningEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntry" ADD CONSTRAINT "PersonalPlanningEntry_originRequestId_fkey" FOREIGN KEY ("originRequestId") REFERENCES "AvailabilityRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

