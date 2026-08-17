-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('EFFECTIF', 'RESSOURCES', 'PROJETS', 'NOUVELLE_FILIALE', 'PERSONNALISE');

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "valeur" DECIMAL(12,4) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL DEFAULT 'BLOQUE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "type" "ScenarioType" NOT NULL,
    "deltaEffectifPercent" DECIMAL(6,2),
    "deltaRessourcesPercent" DECIMAL(6,2),
    "deltaProjetsPercent" DECIMAL(6,2),
    "nouvelleFilialeEffectif" INTEGER,
    "nouvelleFilialeProjets" INTEGER,
    "departmentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricSnapshot_entityType_entityId_metric_capturedAt_idx" ON "MetricSnapshot"("entityType", "entityId", "metric", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MetricSnapshot_entityType_entityId_metric_capturedAt_key" ON "MetricSnapshot"("entityType", "entityId", "metric", "capturedAt");

-- CreateIndex
CREATE INDEX "Dependency_sourceType_sourceId_idx" ON "Dependency"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Dependency_targetType_targetId_idx" ON "Dependency"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Dependency_sourceType_sourceId_targetType_targetId_key" ON "Dependency"("sourceType", "sourceId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "Scenario_departmentId_idx" ON "Scenario"("departmentId");

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
