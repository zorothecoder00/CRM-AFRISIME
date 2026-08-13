-- DropForeignKey
ALTER TABLE "Indicator" DROP CONSTRAINT "Indicator_objectiveId_fkey";

-- DropForeignKey
ALTER TABLE "MeetingDecision" DROP CONSTRAINT "MeetingDecision_meetingId_fkey";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "taskId" TEXT,
ALTER COLUMN "objectiveId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MeetingDecision" ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "meetingId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "creeParWorkflow" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ValidationWorkflowStep" ADD COLUMN     "montantMax" DECIMAL(14,2),
ADD COLUMN     "montantMin" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "ProjectResource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT,
    "quantite" DECIMAL(10,2),
    "unite" TEXT,
    "coutUnitaire" DECIMAL(14,2),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectResource_projectId_idx" ON "ProjectResource"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_teamId_key" ON "Conversation"("teamId");

-- CreateIndex
CREATE INDEX "Indicator_projectId_idx" ON "Indicator"("projectId");

-- CreateIndex
CREATE INDEX "Indicator_taskId_idx" ON "Indicator"("taskId");

-- CreateIndex
CREATE INDEX "MeetingDecision_projectId_idx" ON "MeetingDecision"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectResource" ADD CONSTRAINT "ProjectResource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResource" ADD CONSTRAINT "ProjectResource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

