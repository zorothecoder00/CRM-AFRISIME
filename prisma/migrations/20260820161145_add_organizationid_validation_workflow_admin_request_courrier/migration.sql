-- AlterTable
ALTER TABLE "AdminRequest" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AdminRequestApproval" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AdminRequestValidationRun" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Courrier" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TaskApproval" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TaskValidationRun" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ValidationWorkflow" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ValidationWorkflowStep" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "ValidationWorkflow" ADD CONSTRAINT "ValidationWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationWorkflowStep" ADD CONSTRAINT "ValidationWorkflowStep_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskValidationRun" ADD CONSTRAINT "TaskValidationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskApproval" ADD CONSTRAINT "TaskApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequest" ADD CONSTRAINT "AdminRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestValidationRun" ADD CONSTRAINT "AdminRequestValidationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestApproval" ADD CONSTRAINT "AdminRequestApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
