-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DISPONIBILITE_MODIFIEE';
ALTER TYPE "NotificationType" ADD VALUE 'STATUT_MODIFIE';

-- DropForeignKey
ALTER TABLE "Meeting" DROP CONSTRAINT "Meeting_projectId_fkey";

-- AlterTable
ALTER TABLE "Meeting" ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PersonalPlanningDailyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalPlanningDailyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalPlanningDailyReview_userId_idx" ON "PersonalPlanningDailyReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalPlanningDailyReview_userId_date_key" ON "PersonalPlanningDailyReview"("userId", "date");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningDailyReview" ADD CONSTRAINT "PersonalPlanningDailyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningDailyReview" ADD CONSTRAINT "PersonalPlanningDailyReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

