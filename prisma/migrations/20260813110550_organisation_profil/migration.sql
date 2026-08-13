-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL DEFAULT 'org-profile',
    "nom" TEXT NOT NULL DEFAULT 'Mon organisation',
    "logoUrl" TEXT,
    "description" TEXT,
    "vision" TEXT,
    "mission" TEXT,
    "valeurs" TEXT,
    "siteWeb" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
