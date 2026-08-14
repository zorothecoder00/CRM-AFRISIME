-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrationType" ADD VALUE 'GOOGLE_WORKSPACE';
ALTER TYPE "IntegrationType" ADD VALUE 'SLACK';
ALTER TYPE "IntegrationType" ADD VALUE 'VISIOCONFERENCE';

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "echeance" TIMESTAMP(3),
ADD COLUMN     "responsableId" TEXT;

-- AlterTable
ALTER TABLE "PermissionOverride" ADD COLUMN     "teamId" TEXT;

-- CreateIndex
CREATE INDEX "PermissionOverride_teamId_idx" ON "PermissionOverride"("teamId");

-- AddForeignKey
ALTER TABLE "PermissionOverride" ADD CONSTRAINT "PermissionOverride_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
