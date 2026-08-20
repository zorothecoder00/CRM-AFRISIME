-- AlterTable
ALTER TABLE "AuditFinding" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AuditMission" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AuditPlan" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AuditPlanDocument" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AuditPlanMember" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ChangeRequest" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ComplianceControl" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ComplianceObligation" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ComplianceObligationDocument" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "NonConformite" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "NonConformiteAction" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "QualityChecklistItem" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "QualityClaim" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "QualityControl" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "QualityDocument" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligationDocument" ADD CONSTRAINT "ComplianceObligationDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformiteAction" ADD CONSTRAINT "NonConformiteAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityDocument" ADD CONSTRAINT "QualityDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityChecklistItem" ADD CONSTRAINT "QualityChecklistItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityClaim" ADD CONSTRAINT "QualityClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlan" ADD CONSTRAINT "AuditPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlanMember" ADD CONSTRAINT "AuditPlanMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlanDocument" ADD CONSTRAINT "AuditPlanDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditMission" ADD CONSTRAINT "AuditMission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
