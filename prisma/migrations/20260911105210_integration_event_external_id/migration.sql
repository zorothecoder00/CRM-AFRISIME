-- Revue de robustesse (2026-09-11) — deduplication des redelivrances
-- webhook (x-event-id ou payload.id/eventId), voir
-- src/app/api/webhooks/[integrationId]/route.ts.

-- AlterTable
ALTER TABLE "IntegrationEvent" ADD COLUMN     "externalEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_integrationId_externalEventId_key" ON "IntegrationEvent"("integrationId", "externalEventId");
