-- CreateEnum
CREATE TYPE "DataFormFieldType" AS ENUM ('TEXTE', 'NOMBRE', 'DATE', 'CHOIX_UNIQUE', 'OUI_NON');

-- CreateTable
CREATE TABLE "ProjectDataForm" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDataForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDataFormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "organizationId" TEXT,
    "label" TEXT NOT NULL,
    "type" "DataFormFieldType" NOT NULL,
    "options" TEXT,
    "requis" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "indicatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDataFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDataFormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "organizationId" TEXT,
    "data" JSONB NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDataFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDataForm_projectId_idx" ON "ProjectDataForm"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDataFormField_formId_idx" ON "ProjectDataFormField"("formId");

-- CreateIndex
CREATE INDEX "ProjectDataFormField_indicatorId_idx" ON "ProjectDataFormField"("indicatorId");

-- CreateIndex
CREATE INDEX "ProjectDataFormSubmission_formId_idx" ON "ProjectDataFormSubmission"("formId");

-- AddForeignKey
ALTER TABLE "ProjectDataForm" ADD CONSTRAINT "ProjectDataForm_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataForm" ADD CONSTRAINT "ProjectDataForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataForm" ADD CONSTRAINT "ProjectDataForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataFormField" ADD CONSTRAINT "ProjectDataFormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ProjectDataForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataFormField" ADD CONSTRAINT "ProjectDataFormField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataFormField" ADD CONSTRAINT "ProjectDataFormField_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataFormSubmission" ADD CONSTRAINT "ProjectDataFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ProjectDataForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataFormSubmission" ADD CONSTRAINT "ProjectDataFormSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDataFormSubmission" ADD CONSTRAINT "ProjectDataFormSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
