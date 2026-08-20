-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "platformOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "CrmContact" ADD COLUMN     "platformOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "CrmInteraction" ADD COLUMN     "platformOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "CrmOpportunity" ADD COLUMN     "platformOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "CrmOrganization" ADD COLUMN     "platformOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "PortalAccount" ADD COLUMN     "platformOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "PortalInviteToken" ADD COLUMN     "platformOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "PortalMessage" ADD COLUMN     "platformOrganizationId" TEXT;

-- AddForeignKey
ALTER TABLE "CrmOrganization" ADD CONSTRAINT "CrmOrganization_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccount" ADD CONSTRAINT "PortalAccount_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalInviteToken" ADD CONSTRAINT "PortalInviteToken_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInteraction" ADD CONSTRAINT "CrmInteraction_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
