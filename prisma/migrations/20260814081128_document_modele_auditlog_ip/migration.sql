-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'MODELE';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "ipAddress" TEXT;
