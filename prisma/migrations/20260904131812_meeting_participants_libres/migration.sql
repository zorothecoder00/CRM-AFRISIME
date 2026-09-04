-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "participantsLibres" TEXT[] DEFAULT ARRAY[]::TEXT[];
