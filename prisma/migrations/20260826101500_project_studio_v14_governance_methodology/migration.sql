-- CreateEnum
CREATE TYPE "ProjectMethodologie" AS ENUM ('AGILE_SCRUM', 'KANBAN', 'WATERFALL', 'HYBRIDE', 'RBM', 'LOGICAL_FRAMEWORK', 'THEORY_OF_CHANGE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectMemberRole" ADD VALUE 'COMITE_PILOTAGE';
ALTER TYPE "ProjectMemberRole" ADD VALUE 'VALIDATEUR';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "methodologie" "ProjectMethodologie";

