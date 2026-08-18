-- CreateEnum
CREATE TYPE "OrganizationalMemoryType" AS ENUM ('DECISION', 'PROJET', 'SUCCES', 'ECHEC', 'INCIDENT', 'RECOMMANDATION', 'PROCEDURE', 'EXPERIENCE', 'TRANSFORMATION');

-- CreateTable
CREATE TABLE "OrganizationalMemoryEntry" (
    "id" TEXT NOT NULL,
    "type" "OrganizationalMemoryType" NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalMemoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationalMemoryEntry_type_idx" ON "OrganizationalMemoryEntry"("type");

-- CreateIndex
CREATE INDEX "OrganizationalMemoryEntry_entityType_entityId_idx" ON "OrganizationalMemoryEntry"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "OrganizationalMemoryEntry" ADD CONSTRAINT "OrganizationalMemoryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
