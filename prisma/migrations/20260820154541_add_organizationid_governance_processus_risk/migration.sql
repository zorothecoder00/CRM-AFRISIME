-- AlterTable
ALTER TABLE "GovernanceDecision" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "GovernanceInstance" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "GovernanceInstanceMember" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "GovernanceMeeting" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "GovernanceMeetingDocument" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "GovernanceMeetingParticipant" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OrganizationalRisk" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Processus" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProcessusDocument" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProcessusEtape" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProcessusExecution" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProcessusExecutionEtape" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProcessusVersion" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "GovernanceInstance" ADD CONSTRAINT "GovernanceInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceInstanceMember" ADD CONSTRAINT "GovernanceInstanceMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeetingParticipant" ADD CONSTRAINT "GovernanceMeetingParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeetingDocument" ADD CONSTRAINT "GovernanceMeetingDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processus" ADD CONSTRAINT "Processus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusEtape" ADD CONSTRAINT "ProcessusEtape_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusVersion" ADD CONSTRAINT "ProcessusVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusExecution" ADD CONSTRAINT "ProcessusExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusExecutionEtape" ADD CONSTRAINT "ProcessusExecutionEtape_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusDocument" ADD CONSTRAINT "ProcessusDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalRisk" ADD CONSTRAINT "OrganizationalRisk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
