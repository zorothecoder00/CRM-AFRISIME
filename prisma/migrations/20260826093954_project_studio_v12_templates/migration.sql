-- CreateEnum
CREATE TYPE "ProjectTemplateCategorie" AS ENUM ('ONG', 'IT', 'EVENEMENTIEL', 'FORMATION', 'AGRICOLE', 'BTP', 'DONOR_FUNDED', 'AUTRE');

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "nom" TEXT NOT NULL,
    "categorie" "ProjectTemplateCategorie" NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTemplatePhase" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "organizationId" TEXT,
    "nom" TEXT NOT NULL,
    "type" "SectionType" NOT NULL DEFAULT 'PHASE',
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectTemplatePhase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTemplatePhase_templateId_idx" ON "ProjectTemplatePhase"("templateId");

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTemplatePhase" ADD CONSTRAINT "ProjectTemplatePhase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTemplatePhase" ADD CONSTRAINT "ProjectTemplatePhase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
