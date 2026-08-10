-- CreateEnum
CREATE TYPE "ObjectivePeriod" AS ENUM ('ANNUEL', 'TRIMESTRIEL', 'MENSUEL', 'HEBDOMADAIRE');

-- CreateEnum
CREATE TYPE "ObjectiveScope" AS ENUM ('INDIVIDUEL', 'EQUIPE', 'DEPARTEMENT');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('EN_COURS', 'ATTEINT', 'NON_ATTEINT', 'ANNULE');

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "periode" "ObjectivePeriod" NOT NULL,
    "scope" "ObjectiveScope" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" "ObjectiveStatus" NOT NULL DEFAULT 'EN_COURS',
    "userId" TEXT,
    "projectId" TEXT,
    "departmentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicator" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "unite" TEXT,
    "valeurCible" DECIMAL(12,2) NOT NULL,
    "valeurActuelle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Objective_userId_idx" ON "Objective"("userId");

-- CreateIndex
CREATE INDEX "Objective_projectId_idx" ON "Objective"("projectId");

-- CreateIndex
CREATE INDEX "Objective_departmentId_idx" ON "Objective"("departmentId");

-- CreateIndex
CREATE INDEX "Objective_periode_idx" ON "Objective"("periode");

-- CreateIndex
CREATE INDEX "Indicator_objectiveId_idx" ON "Indicator"("objectiveId");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
