-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BUDGET_DEPASSE';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "coutReel" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "externalContactId" TEXT;

-- CreateIndex
CREATE INDEX "Task_externalContactId_idx" ON "Task"("externalContactId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_externalContactId_fkey" FOREIGN KEY ("externalContactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
