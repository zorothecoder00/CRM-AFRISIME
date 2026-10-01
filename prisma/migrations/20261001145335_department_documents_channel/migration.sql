-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_DEPARTEMENT';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_departmentId_key" ON "Conversation"("departmentId");

-- CreateIndex
CREATE INDEX "Document_departmentId_idx" ON "Document"("departmentId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

