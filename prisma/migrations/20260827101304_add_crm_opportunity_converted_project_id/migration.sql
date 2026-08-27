-- AlterTable
ALTER TABLE "CrmOpportunity" ADD COLUMN     "convertedProjectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CrmOpportunity_convertedProjectId_key" ON "CrmOpportunity"("convertedProjectId");

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_convertedProjectId_fkey" FOREIGN KEY ("convertedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
