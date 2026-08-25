-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REUNION_INVITATION';

-- AlterTable
ALTER TABLE "MeetingParticipant" ADD COLUMN     "present" BOOLEAN;
