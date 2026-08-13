-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CONTRAT', 'RAPPORT', 'FACTURE', 'PROCES_VERBAL', 'LIVRABLE', 'AUTRE');

-- CreateEnum
CREATE TYPE "DocumentSignatureStatus" AS ENUM ('NON_REQUISE', 'EN_ATTENTE', 'SIGNE', 'REFUSE');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "dateArchivage" TIMESTAMP(3),
ADD COLUMN     "dateSignature" TIMESTAMP(3),
ADD COLUMN     "estArchive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statutSignature" "DocumentSignatureStatus" NOT NULL DEFAULT 'NON_REQUISE',
ADD COLUMN     "type" "DocumentType" NOT NULL DEFAULT 'AUTRE';

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_estArchive_idx" ON "Document"("estArchive");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

