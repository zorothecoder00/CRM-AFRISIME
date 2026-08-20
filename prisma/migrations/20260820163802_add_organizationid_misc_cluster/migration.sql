-- AlterTable
ALTER TABLE "AiAgentInsight" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Beneficiaire" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "DashboardWidgetPreference" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "DataClassification" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "DecisionMatrix" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "DecisionOption" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Dependency" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "EntityTag" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "IntegrationEvent" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MetricSnapshot" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OrgDesignDraft" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OrganizationalMemoryEntry" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Transformation" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "OrgDesignDraft" ADD CONSTRAINT "OrgDesignDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataClassification" ADD CONSTRAINT "DataClassification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transformation" ADD CONSTRAINT "Transformation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalMemoryEntry" ADD CONSTRAINT "OrganizationalMemoryEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMatrix" ADD CONSTRAINT "DecisionMatrix_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionOption" ADD CONSTRAINT "DecisionOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidgetPreference" ADD CONSTRAINT "DashboardWidgetPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentInsight" ADD CONSTRAINT "AiAgentInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiaire" ADD CONSTRAINT "Beneficiaire_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
