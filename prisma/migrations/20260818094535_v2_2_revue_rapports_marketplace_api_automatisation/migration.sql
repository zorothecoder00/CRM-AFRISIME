-- CreateEnum
CREATE TYPE "AppCategory" AS ENUM ('RH', 'JURIDIQUE', 'ONG', 'BTP', 'CABINET_CONSEIL', 'INCUBATEUR', 'FORMATION', 'GESTION_ASSOCIATIVE', 'GESTION_PROGRAMMES', 'GESTION_PROJETS_FINANCES');

-- CreateEnum
CREATE TYPE "AppCatalogStatut" AS ENUM ('PLANIFIE', 'BIENTOT', 'DISPONIBLE');

-- AlterEnum
ALTER TYPE "AutomationTrigger" ADD VALUE 'INTEGRATION_EVENT_RECEIVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrationType" ADD VALUE 'EMAIL';
ALTER TYPE "IntegrationType" ADD VALUE 'CALENDRIER';
ALTER TYPE "IntegrationType" ADD VALUE 'STOCKAGE_DOCUMENTAIRE';
ALTER TYPE "IntegrationType" ADD VALUE 'SYSTEME_FINANCIER';
ALTER TYPE "IntegrationType" ADD VALUE 'OUTIL_MARKETING';
ALTER TYPE "IntegrationType" ADD VALUE 'OUTIL_BI';

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdById" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppCatalogEntry" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" "AppCategory" NOT NULL,
    "description" TEXT,
    "statut" "AppCatalogStatut" NOT NULL DEFAULT 'PLANIFIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
