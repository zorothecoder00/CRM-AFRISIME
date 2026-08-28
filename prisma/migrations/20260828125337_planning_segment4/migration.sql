-- CreateEnum
CREATE TYPE "UserWorkScheduleType" AS ENUM ('NORMAL', 'FLEXIBLE', 'TELETRAVAIL', 'MISSION', 'ABSENCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationTrigger" ADD VALUE 'TASK_BLOCKED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'MEETING_COMPLETED';

-- CreateTable
CREATE TABLE "UserWorkSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "jourSemaine" INTEGER NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "pauseDebut" TEXT,
    "pauseFin" TEXT,
    "type" "UserWorkScheduleType" NOT NULL DEFAULT 'NORMAL',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWorkSchedule_userId_idx" ON "UserWorkSchedule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkSchedule_userId_jourSemaine_key" ON "UserWorkSchedule"("userId", "jourSemaine");

-- AddForeignKey
ALTER TABLE "UserWorkSchedule" ADD CONSTRAINT "UserWorkSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkSchedule" ADD CONSTRAINT "UserWorkSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

