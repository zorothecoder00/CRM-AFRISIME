-- AlterTable
ALTER TABLE "Objective" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Objective_parentId_idx" ON "Objective"("parentId");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
