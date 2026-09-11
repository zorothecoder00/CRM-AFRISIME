-- Revue de robustesse (2026-09-11) — OrganizationProfile passe d'une ligne
-- unique partagee ("org-profile") a un profil par organisation : sans ce
-- rattachement, modifier son profil ecrasait celui de toutes les autres
-- organisations. organizationId reste nullable (retro-compatible avec la
-- ligne historique le temps du backfill, voir
-- scripts/backfill-platform-organization.ts).

-- AlterTable
ALTER TABLE "OrganizationProfile" ADD COLUMN     "organizationId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_organizationId_key" ON "OrganizationProfile"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
