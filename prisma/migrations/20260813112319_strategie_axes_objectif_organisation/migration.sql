-- AlterEnum
ALTER TYPE "ObjectiveScope" ADD VALUE 'ORGANISATION';

-- AlterTable
ALTER TABLE "Objective" ADD COLUMN     "axisId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "axisId" TEXT;

-- CreateTable
CREATE TABLE "StrategicAxis" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "priorite" "ProjectPriority" NOT NULL DEFAULT 'MOYENNE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicAxis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Objective_axisId_idx" ON "Objective"("axisId");

-- AddForeignKey
ALTER TABLE "StrategicAxis" ADD CONSTRAINT "StrategicAxis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "StrategicAxis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "StrategicAxis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
