-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
