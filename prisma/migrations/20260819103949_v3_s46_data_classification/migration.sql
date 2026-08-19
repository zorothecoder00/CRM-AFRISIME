-- CreateEnum
CREATE TYPE "DataClassificationLevel" AS ENUM ('PUBLIC', 'INTERNE', 'CONFIDENTIEL', 'RESTREINT');

-- CreateEnum
CREATE TYPE "DataSensitivity" AS ENUM ('NORMALE', 'PERSONNELLE', 'FINANCIERE', 'STRATEGIQUE');

-- CreateEnum
CREATE TYPE "DataQualityNiveau" AS ENUM ('NON_EVALUEE', 'FAIBLE', 'MOYENNE', 'BONNE', 'EXCELLENTE');

-- CreateTable
CREATE TABLE "DataClassification" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "niveau" "DataClassificationLevel" NOT NULL DEFAULT 'INTERNE',
    "sensibilite" "DataSensitivity" NOT NULL DEFAULT 'NORMALE',
    "qualite" "DataQualityNiveau" NOT NULL DEFAULT 'NON_EVALUEE',
    "proprietaireId" TEXT,
    "notes" TEXT,
    "classifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataClassification_entityType_entityId_idx" ON "DataClassification"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "DataClassification_entityType_entityId_key" ON "DataClassification"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "DataClassification" ADD CONSTRAINT "DataClassification_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataClassification" ADD CONSTRAINT "DataClassification_classifiedById_fkey" FOREIGN KEY ("classifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
