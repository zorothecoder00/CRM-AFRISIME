-- AlterTable
ALTER TABLE "AppCatalogEntry" ADD COLUMN     "casUsage" TEXT;

-- CreateTable
CREATE TABLE "AppCatalogInterest" (
    "id" TEXT NOT NULL,
    "appCatalogEntryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppCatalogInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppCatalogInterest_appCatalogEntryId_idx" ON "AppCatalogInterest"("appCatalogEntryId");

-- CreateIndex
CREATE INDEX "AppCatalogInterest_userId_idx" ON "AppCatalogInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppCatalogInterest_appCatalogEntryId_userId_key" ON "AppCatalogInterest"("appCatalogEntryId", "userId");

-- AddForeignKey
ALTER TABLE "AppCatalogInterest" ADD CONSTRAINT "AppCatalogInterest_appCatalogEntryId_fkey" FOREIGN KEY ("appCatalogEntryId") REFERENCES "AppCatalogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppCatalogInterest" ADD CONSTRAINT "AppCatalogInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
