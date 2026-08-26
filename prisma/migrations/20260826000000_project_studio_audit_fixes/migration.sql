-- CreateTable
CREATE TABLE "ProjectPartner" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "crmOrganizationId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "ProjectPartner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectPartner_crmOrganizationId_idx" ON "ProjectPartner"("crmOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPartner_projectId_crmOrganizationId_key" ON "ProjectPartner"("projectId", "crmOrganizationId");

-- AddForeignKey
ALTER TABLE "ProjectPartner" ADD CONSTRAINT "ProjectPartner_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartner" ADD CONSTRAINT "ProjectPartner_crmOrganizationId_fkey" FOREIGN KEY ("crmOrganizationId") REFERENCES "CrmOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartner" ADD CONSTRAINT "ProjectPartner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

