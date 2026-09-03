-- Partage du planning personnel (demande utilisateur, "partager son agenda
-- avec une secretaire par exemple") : octroi explicite en lecture seule,
-- distinct du controle manager/chef d'equipe deja existant.

-- CreateTable
CREATE TABLE "PersonalPlanningShare" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "ownerId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalPlanningShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalPlanningShare_granteeId_idx" ON "PersonalPlanningShare"("granteeId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalPlanningShare_ownerId_granteeId_key" ON "PersonalPlanningShare"("ownerId", "granteeId");

-- AddForeignKey
ALTER TABLE "PersonalPlanningShare" ADD CONSTRAINT "PersonalPlanningShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningShare" ADD CONSTRAINT "PersonalPlanningShare_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPlanningShare" ADD CONSTRAINT "PersonalPlanningShare_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
