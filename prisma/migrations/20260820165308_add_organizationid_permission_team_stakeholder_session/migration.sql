-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PermissionOverride" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Stakeholder" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "StakeholderCommunication" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "StakeholderProject" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionOverride" ADD CONSTRAINT "PermissionOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeholderProject" ADD CONSTRAINT "StakeholderProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeholderCommunication" ADD CONSTRAINT "StakeholderCommunication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
