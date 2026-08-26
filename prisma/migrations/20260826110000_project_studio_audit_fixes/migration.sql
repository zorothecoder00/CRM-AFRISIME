-- AlterTable
ALTER TABLE "DocumentVersion" ADD COLUMN     "valide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "valideLe" TIMESTAMP(3),
ADD COLUMN     "valideParId" TEXT;

-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "theoryOfChangeNodeId" TEXT;

-- CreateTable
CREATE TABLE "ProblemTreeNodeDocument" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemTreeNodeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTreeNodeIndicator" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemTreeNodeIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTreeNodeComment" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "organizationId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemTreeNodeComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemTreeNodeDocument_nodeId_idx" ON "ProblemTreeNodeDocument"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemTreeNodeDocument_nodeId_documentId_key" ON "ProblemTreeNodeDocument"("nodeId", "documentId");

-- CreateIndex
CREATE INDEX "ProblemTreeNodeIndicator_nodeId_idx" ON "ProblemTreeNodeIndicator"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemTreeNodeIndicator_nodeId_indicatorId_key" ON "ProblemTreeNodeIndicator"("nodeId", "indicatorId");

-- CreateIndex
CREATE INDEX "ProblemTreeNodeComment_nodeId_idx" ON "ProblemTreeNodeComment"("nodeId");

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_theoryOfChangeNodeId_fkey" FOREIGN KEY ("theoryOfChangeNodeId") REFERENCES "TheoryOfChangeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeDocument" ADD CONSTRAINT "ProblemTreeNodeDocument_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ProblemTreeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeDocument" ADD CONSTRAINT "ProblemTreeNodeDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeDocument" ADD CONSTRAINT "ProblemTreeNodeDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeIndicator" ADD CONSTRAINT "ProblemTreeNodeIndicator_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ProblemTreeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeIndicator" ADD CONSTRAINT "ProblemTreeNodeIndicator_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeIndicator" ADD CONSTRAINT "ProblemTreeNodeIndicator_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeComment" ADD CONSTRAINT "ProblemTreeNodeComment_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ProblemTreeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeComment" ADD CONSTRAINT "ProblemTreeNodeComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTreeNodeComment" ADD CONSTRAINT "ProblemTreeNodeComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

