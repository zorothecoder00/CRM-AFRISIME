-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('AFRIGES', 'M365', 'WHATSAPP', 'AUTRE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTE', 'DECONNECTE', 'ERREUR');

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "statut" "IntegrationStatus" NOT NULL DEFAULT 'DECONNECTE',
    "apiKey" TEXT,
    "webhookUrl" TEXT,
    "description" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationEvent_integrationId_idx" ON "IntegrationEvent"("integrationId");

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
