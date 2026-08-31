-- CreateTable
CREATE TABLE "UserWorkScheduleException" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "pauseDebut" TEXT,
    "pauseFin" TEXT,
    "type" "UserWorkScheduleType" NOT NULL DEFAULT 'NORMAL',
    "motif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWorkScheduleException_userId_idx" ON "UserWorkScheduleException"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkScheduleException_userId_date_key" ON "UserWorkScheduleException"("userId", "date");

-- AddForeignKey
ALTER TABLE "UserWorkScheduleException" ADD CONSTRAINT "UserWorkScheduleException_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkScheduleException" ADD CONSTRAINT "UserWorkScheduleException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
