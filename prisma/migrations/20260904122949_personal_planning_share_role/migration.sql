-- CreateEnum
CREATE TYPE "PersonalPlanningShareRole" AS ENUM ('LECTEUR', 'EDITEUR');

-- AlterTable
ALTER TABLE "PersonalPlanningShare" ADD COLUMN     "role" "PersonalPlanningShareRole" NOT NULL DEFAULT 'LECTEUR';
