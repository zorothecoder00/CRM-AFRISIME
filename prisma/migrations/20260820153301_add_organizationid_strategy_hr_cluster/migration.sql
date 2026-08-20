-- AlterTable
ALTER TABLE "DecisionOutcome" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Delegation" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Poste" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PosteResponsabilite" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProgrammeRisk" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "StrategicAxis" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SuccessionCandidate" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SuccessionPlan" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SwotItem" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "DecisionOutcome" ADD CONSTRAINT "DecisionOutcome_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosteResponsabilite" ADD CONSTRAINT "PosteResponsabilite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionCandidate" ADD CONSTRAINT "SuccessionCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicAxis" ADD CONSTRAINT "StrategicAxis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwotItem" ADD CONSTRAINT "SwotItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeRisk" ADD CONSTRAINT "ProgrammeRisk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
