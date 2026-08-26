-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('SUCCES', 'ECHEC');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "dateFinReelle" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectClosureChecklist" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT,
    "documentsArchives" BOOLEAN NOT NULL DEFAULT false,
    "actifsTransferes" BOOLEAN NOT NULL DEFAULT false,
    "rapportsRemis" BOOLEAN NOT NULL DEFAULT false,
    "beneficiairesInformes" BOOLEAN NOT NULL DEFAULT false,
    "partenairesInformes" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectClosureChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLessonLearned" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "LessonType" NOT NULL,
    "titre" TEXT NOT NULL,
    "pourquoi" TEXT,
    "actionRetenue" TEXT,
    "recommandations" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLessonLearned_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectClosureChecklist_projectId_key" ON "ProjectClosureChecklist"("projectId");

-- CreateIndex
CREATE INDEX "ProjectLessonLearned_projectId_idx" ON "ProjectLessonLearned"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectClosureChecklist" ADD CONSTRAINT "ProjectClosureChecklist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectClosureChecklist" ADD CONSTRAINT "ProjectClosureChecklist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLessonLearned" ADD CONSTRAINT "ProjectLessonLearned_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLessonLearned" ADD CONSTRAINT "ProjectLessonLearned_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLessonLearned" ADD CONSTRAINT "ProjectLessonLearned_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
