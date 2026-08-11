-- CreateEnum
CREATE TYPE "ValidationEntityType" AS ENUM ('TASK');

-- CreateEnum
CREATE TYPE "ValidationStepStatus" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');

-- CreateEnum
CREATE TYPE "ValidationRunStatus" AS ENUM ('EN_COURS', 'APPROUVE', 'REJETE');

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('GRANT', 'DENY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SURCHARGE';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentMimeType" TEXT,
ADD COLUMN     "attachmentNom" TEXT,
ADD COLUMN     "attachmentSizeBytes" INTEGER,
ADD COLUMN     "attachmentUrl" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dateDebut" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PermissionOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "departmentId" TEXT,
    "projectId" TEXT,
    "effect" "PermissionEffect" NOT NULL DEFAULT 'GRANT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionComment" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationWorkflow" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "entityType" "ValidationEntityType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationWorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "approverRole" "RoleKey" NOT NULL,
    "label" TEXT,

    CONSTRAINT "ValidationWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskValidationRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "statut" "ValidationRunStatus" NOT NULL DEFAULT 'EN_COURS',
    "currentOrdre" INTEGER NOT NULL DEFAULT 1,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskApproval" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "statut" "ValidationStepStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "approverId" TEXT,
    "commentaire" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PermissionOverride_userId_permissionKey_idx" ON "PermissionOverride"("userId", "permissionKey");

-- CreateIndex
CREATE INDEX "PermissionOverride_departmentId_idx" ON "PermissionOverride"("departmentId");

-- CreateIndex
CREATE INDEX "PermissionOverride_projectId_idx" ON "PermissionOverride"("projectId");

-- CreateIndex
CREATE INDEX "SectionComment_sectionId_idx" ON "SectionComment"("sectionId");

-- CreateIndex
CREATE INDEX "ValidationWorkflow_entityType_isActive_idx" ON "ValidationWorkflow"("entityType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationWorkflowStep_workflowId_ordre_key" ON "ValidationWorkflowStep"("workflowId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "TaskValidationRun_taskId_key" ON "TaskValidationRun"("taskId");

-- CreateIndex
CREATE INDEX "TaskValidationRun_taskId_idx" ON "TaskValidationRun"("taskId");

-- CreateIndex
CREATE INDEX "TaskApproval_runId_idx" ON "TaskApproval"("runId");

-- CreateIndex
CREATE INDEX "TaskApproval_approverId_idx" ON "TaskApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskApproval_runId_stepId_key" ON "TaskApproval"("runId", "stepId");

-- CreateIndex
CREATE INDEX "Document_sectionId_idx" ON "Document"("sectionId");

-- CreateIndex
CREATE INDEX "ProjectSection_responsableId_idx" ON "ProjectSection"("responsableId");

-- AddForeignKey
ALTER TABLE "PermissionOverride" ADD CONSTRAINT "PermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionOverride" ADD CONSTRAINT "PermissionOverride_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionOverride" ADD CONSTRAINT "PermissionOverride_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionOverride" ADD CONSTRAINT "PermissionOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSection" ADD CONSTRAINT "ProjectSection_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionComment" ADD CONSTRAINT "SectionComment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionComment" ADD CONSTRAINT "SectionComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationWorkflow" ADD CONSTRAINT "ValidationWorkflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationWorkflowStep" ADD CONSTRAINT "ValidationWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ValidationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskValidationRun" ADD CONSTRAINT "TaskValidationRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskValidationRun" ADD CONSTRAINT "TaskValidationRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ValidationWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskValidationRun" ADD CONSTRAINT "TaskValidationRun_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskApproval" ADD CONSTRAINT "TaskApproval_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TaskValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskApproval" ADD CONSTRAINT "TaskApproval_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ValidationWorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskApproval" ADD CONSTRAINT "TaskApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
