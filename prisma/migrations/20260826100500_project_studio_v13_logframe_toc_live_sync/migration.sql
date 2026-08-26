-- AlterTable
ALTER TABLE "LogframeRow" ADD COLUMN     "theoryOfChangeNodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LogframeRow_theoryOfChangeNodeId_key" ON "LogframeRow"("theoryOfChangeNodeId");

-- AddForeignKey
ALTER TABLE "LogframeRow" ADD CONSTRAINT "LogframeRow_theoryOfChangeNodeId_fkey" FOREIGN KEY ("theoryOfChangeNodeId") REFERENCES "TheoryOfChangeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

