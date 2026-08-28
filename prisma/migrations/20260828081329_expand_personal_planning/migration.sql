-- CreateEnum
CREATE TYPE "PersonalPlanningEntryStatut" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "PersonalPlanningPriorite" AS ENUM ('CRITIQUE', 'IMPORTANTE', 'NORMALE');

-- CreateEnum
CREATE TYPE "PersonalPlanningRepetition" AS ENUM ('AUCUNE', 'QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE');

-- CreateEnum
CREATE TYPE "PersonalPlanningRappel" AS ENUM ('AUCUN', 'LE_JOUR_MEME', 'VEILLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'RAPPEL_ACTIVITE';
ALTER TYPE "NotificationType" ADD VALUE 'ACTIVITE_INVITATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'TACHE';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'REUNION';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'RENDEZ_VOUS';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'APPEL';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'MISSION';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'FORMATION';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'DEPLACEMENT';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'TRAVAIL_PERSONNEL';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'PAUSE';
ALTER TYPE "PersonalPlanningEntryType" ADD VALUE 'EVENEMENT';

-- AlterTable
ALTER TABLE "PersonalPlanningEntry" ADD COLUMN     "lieu" TEXT,
ADD COLUMN     "objectifId" TEXT,
ADD COLUMN     "piecesJointes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "priorite" "PersonalPlanningPriorite" NOT NULL DEFAULT 'NORMALE',
ADD COLUMN     "projetId" TEXT,
ADD COLUMN     "rappel" "PersonalPlanningRappel" NOT NULL DEFAULT 'AUCUN',
ADD COLUMN     "recurrenceGroupId" TEXT,
ADD COLUMN     "repetition" "PersonalPlanningRepetition" NOT NULL DEFAULT 'AUCUNE',
ADD COLUMN     "repetitionFin" TIMESTAMP(3),
ADD COLUMN     "statut" "PersonalPlanningEntryStatut" NOT NULL DEFAULT 'PLANIFIEE',
ADD COLUMN     "tacheId" TEXT;

-- CreateTable
CREATE TABLE "PersonalPlanningEntryParticipant" (
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalPlanningEntryParticipant_pkey" PRIMARY KEY ("entryId","userId")
);

-- CreateIndex
CREATE INDEX "PersonalPlanningEntry_tacheId_idx" ON "PersonalPlanningEntry"("tacheId");

-- CreateIndex
CREATE INDEX "PersonalPlanningEntry_recurrenceGroupId_idx" ON "PersonalPlanningEntry"("recurrenceGroupId");

-- CreateIndex
CREATE INDEX "PersonalPlanningEntry_statut_idx" ON "PersonalPlanningEntry"("statut");

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntry" ADD CONSTRAINT "PersonalPlanningEntry_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntry" ADD CONSTRAINT "PersonalPlanningEntry_tacheId_fkey" FOREIGN KEY ("tacheId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntry" ADD CONSTRAINT "PersonalPlanningEntry_objectifId_fkey" FOREIGN KEY ("objectifId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntryParticipant" ADD CONSTRAINT "PersonalPlanningEntryParticipant_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PersonalPlanningEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntryParticipant" ADD CONSTRAINT "PersonalPlanningEntryParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningEntryParticipant" ADD CONSTRAINT "PersonalPlanningEntryParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
