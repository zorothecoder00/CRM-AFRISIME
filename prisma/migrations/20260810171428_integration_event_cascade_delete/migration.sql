-- DropForeignKey
ALTER TABLE "IntegrationEvent" DROP CONSTRAINT "IntegrationEvent_integrationId_fkey";

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
