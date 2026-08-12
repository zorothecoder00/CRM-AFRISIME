-- CreateEnum
CREATE TYPE "PlanNiveau" AS ENUM ('STRATEGIQUE', 'ANNUEL', 'TRIMESTRIEL', 'MENSUEL');

-- AlterTable
ALTER TABLE "Objective" ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "niveau" "PlanNiveau" NOT NULL,
    "description" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "budgetIndicatif" DECIMAL(14,2),
    "priorites" TEXT,
    "statut" "ProjectStatus" NOT NULL DEFAULT 'PLANIFIE',
    "departmentId" TEXT,
    "parentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plan_departmentId_idx" ON "Plan"("departmentId");

-- CreateIndex
CREATE INDEX "Plan_parentId_idx" ON "Plan"("parentId");

-- CreateIndex
CREATE INDEX "Plan_niveau_idx" ON "Plan"("niveau");

-- CreateIndex
CREATE INDEX "Objective_planId_idx" ON "Objective"("planId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
