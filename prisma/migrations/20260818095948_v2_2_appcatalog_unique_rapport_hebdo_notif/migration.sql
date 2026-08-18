
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RAPPORT_HEBDOMADAIRE';

-- CreateIndex
CREATE UNIQUE INDEX "AppCatalogEntry_nom_key" ON "AppCatalogEntry"("nom");

