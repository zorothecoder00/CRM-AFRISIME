-- CreateEnum
CREATE TYPE "IndicatorFrequence" AS ENUM ('PONCTUELLE', 'MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE');

-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "baseline" DECIMAL(12,2),
ADD COLUMN     "definition" TEXT,
ADD COLUMN     "desagregation" TEXT,
ADD COLUMN     "formule" TEXT,
ADD COLUMN     "frequence" "IndicatorFrequence",
ADD COLUMN     "responsableId" TEXT,
ADD COLUMN     "source" TEXT;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
