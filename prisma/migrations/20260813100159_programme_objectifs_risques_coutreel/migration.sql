-- AlterEnum
ALTER TYPE "ObjectiveScope" ADD VALUE 'PROGRAMME';

-- AlterTable
ALTER TABLE "Objective" ADD COLUMN     "programmeId" TEXT;

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN     "coutReel" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "ProgrammeRisk" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "probabilite" "RiskProbability" NOT NULL DEFAULT 'MOYENNE',
    "impact" "RiskImpact" NOT NULL DEFAULT 'MOYEN',
    "statut" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIE',
    "planMitigation" TEXT,
    "responsableId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammeRisk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgrammeRisk_programmeId_idx" ON "ProgrammeRisk"("programmeId");

-- CreateIndex
CREATE INDEX "Objective_programmeId_idx" ON "Objective"("programmeId");

-- AddForeignKey
ALTER TABLE "ProgrammeRisk" ADD CONSTRAINT "ProgrammeRisk_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeRisk" ADD CONSTRAINT "ProgrammeRisk_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeRisk" ADD CONSTRAINT "ProgrammeRisk_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
