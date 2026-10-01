-- DropForeignKey
ALTER TABLE "DocumentFolder" DROP CONSTRAINT "DocumentFolder_projectId_fkey";

-- AlterTable
ALTER TABLE "DocumentFolder" ALTER COLUMN "projectId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
