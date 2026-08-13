-- CreateEnum
CREATE TYPE "MeetingRecurrence" AS ENUM ('AUCUNE', 'HEBDOMADAIRE', 'MENSUELLE');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('MANAGER', 'AUTO', 'PAIRS_360', 'PROJET');

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "type" "EvaluationType" NOT NULL DEFAULT 'MANAGER';

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "recurrence" "MeetingRecurrence" NOT NULL DEFAULT 'AUCUNE',
ADD COLUMN     "recurrenceParentId" TEXT;

-- CreateIndex
CREATE INDEX "Evaluation_projectId_idx" ON "Evaluation"("projectId");

-- CreateIndex
CREATE INDEX "Meeting_recurrenceParentId_idx" ON "Meeting"("recurrenceParentId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
