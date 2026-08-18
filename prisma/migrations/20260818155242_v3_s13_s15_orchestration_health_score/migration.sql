-- CreateEnum
CREATE TYPE "HealthScoreDimension" AS ENUM ('PERFORMANCE', 'CHARGE', 'RISQUES', 'PROJETS', 'PROCESSUS', 'QUALITE', 'GOUVERNANCE', 'TURNOVER', 'SATISFACTION', 'ECHEANCES');

-- AlterEnum
ALTER TYPE "AutomationActionType" ADD VALUE 'ORCHESTRATE_NOUVEAU_CONTRAT';

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "orchestrationDepartmentId" TEXT,
ADD COLUMN     "orchestrationResponsableId" TEXT;

-- CreateTable
CREATE TABLE "HealthScoreWeight" (
    "dimension" "HealthScoreDimension" NOT NULL,
    "poids" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthScoreWeight_pkey" PRIMARY KEY ("dimension")
);

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_orchestrationDepartmentId_fkey" FOREIGN KEY ("orchestrationDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_orchestrationResponsableId_fkey" FOREIGN KEY ("orchestrationResponsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
