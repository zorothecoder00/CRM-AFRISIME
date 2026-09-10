-- CreateTable
CREATE TABLE "ActivityReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "ActivityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityReportShare" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityReportShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityReport_createdById_idx" ON "ActivityReport"("createdById");

-- CreateIndex
CREATE INDEX "ActivityReport_deletedAt_idx" ON "ActivityReport"("deletedAt");

-- CreateIndex
CREATE INDEX "ActivityReportShare_reportId_idx" ON "ActivityReportShare"("reportId");

-- CreateIndex
CREATE INDEX "ActivityReportShare_userId_idx" ON "ActivityReportShare"("userId");

-- CreateIndex
CREATE INDEX "ActivityReportShare_teamId_idx" ON "ActivityReportShare"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityReportShare_reportId_userId_key" ON "ActivityReportShare"("reportId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityReportShare_reportId_teamId_key" ON "ActivityReportShare"("reportId", "teamId");

-- AddForeignKey
ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReportShare" ADD CONSTRAINT "ActivityReportShare_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ActivityReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReportShare" ADD CONSTRAINT "ActivityReportShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReportShare" ADD CONSTRAINT "ActivityReportShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReportShare" ADD CONSTRAINT "ActivityReportShare_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReportShare" ADD CONSTRAINT "ActivityReportShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
