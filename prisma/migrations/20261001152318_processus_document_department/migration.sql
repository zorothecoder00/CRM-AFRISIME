-- AlterTable
ALTER TABLE "ProcessusDocument" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "ProcessusDocument_departmentId_idx" ON "ProcessusDocument"("departmentId");

-- AddForeignKey
ALTER TABLE "ProcessusDocument" ADD CONSTRAINT "ProcessusDocument_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

