-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "DocumentAccess" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "DocumentVersion" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MeetingDecision" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MeetingExternalParticipant" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MeetingParticipant" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SectionComment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TaskAssignee" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TaskComment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TaskDependency" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "SectionComment" ADD CONSTRAINT "SectionComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingExternalParticipant" ADD CONSTRAINT "MeetingExternalParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
