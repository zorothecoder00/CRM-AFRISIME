-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
