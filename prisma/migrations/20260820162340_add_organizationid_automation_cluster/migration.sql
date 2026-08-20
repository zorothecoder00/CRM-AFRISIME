-- AlterTable
ALTER TABLE "AutomationCondition" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AutomationExecution" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OrchestrationPlaybook" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PendingAiAction" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "AutomationCondition" ADD CONSTRAINT "AutomationCondition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationPlaybook" ADD CONSTRAINT "OrchestrationPlaybook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAiAction" ADD CONSTRAINT "PendingAiAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
