-- CreateEnum
CREATE TYPE "PlatformOrganizationStatut" AS ENUM ('ACTIVE', 'SUSPENDUE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "PlatformOrganizationPlan" AS ENUM ('GRATUIT', 'STANDARD', 'PREMIUM');

-- CreateTable
CREATE TABLE "PlatformOrganization" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "statut" "PlatformOrganizationStatut" NOT NULL DEFAULT 'ACTIVE',
    "plan" "PlatformOrganizationPlan" NOT NULL DEFAULT 'STANDARD',
    "logoUrl" TEXT,
    "couleurPrimaire" TEXT,
    "configuration" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformOrganization_slug_key" ON "PlatformOrganization"("slug");

-- AddForeignKey
ALTER TABLE "PlatformOrganization" ADD CONSTRAINT "PlatformOrganization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
