-- AlterTable
ALTER TABLE "ProjectDeliverable" ADD COLUMN     "criteresAcceptation" TEXT,
ADD COLUMN     "valideLe" TIMESTAMP(3),
ADD COLUMN     "valideParId" TEXT,
ADD COLUMN     "version" TEXT;

-- AlterTable
ALTER TABLE "ProjectMilestone" ADD COLUMN     "dateReelle" TIMESTAMP(3),
ADD COLUMN     "valideLe" TIMESTAMP(3),
ADD COLUMN     "valideParId" TEXT;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
