-- AlterTable
ALTER TABLE "AdminRequest" ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "objectiveId" TEXT,
ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "ValidationWorkflow" ADD COLUMN     "adminRequestType" "AdminRequestType",
ADD COLUMN     "autoTaskProjectId" TEXT,
ADD COLUMN     "creerTacheAlApprobation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montantMin" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "ValidationWorkflowStep" ADD COLUMN     "escaladeJours" INTEGER,
ADD COLUMN     "escaladeRole" "RoleKey";

-- CreateIndex
CREATE UNIQUE INDEX "AdminRequest_taskId_key" ON "AdminRequest"("taskId");

-- CreateIndex
CREATE INDEX "Task_objectiveId_idx" ON "Task"("objectiveId");

-- CreateIndex
CREATE INDEX "Task_planId_idx" ON "Task"("planId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationWorkflow" ADD CONSTRAINT "ValidationWorkflow_autoTaskProjectId_fkey" FOREIGN KEY ("autoTaskProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequest" ADD CONSTRAINT "AdminRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

