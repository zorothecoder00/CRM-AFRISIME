-- CreateEnum
CREATE TYPE "DocumentValidationStatus" AS ENUM ('NON_REQUISE', 'EN_ATTENTE', 'VALIDE', 'REJETE');

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploadedById_fkey";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "commentaireValidationExterne" TEXT,
ADD COLUMN     "dateValidationExterne" TIMESTAMP(3),
ADD COLUMN     "uploadedByContactId" TEXT,
ADD COLUMN     "validationExterne" "DocumentValidationStatus" NOT NULL DEFAULT 'NON_REQUISE',
ALTER COLUMN "uploadedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByContactId_fkey" FOREIGN KEY ("uploadedByContactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

