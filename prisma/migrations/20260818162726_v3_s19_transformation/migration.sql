-- CreateEnum
CREATE TYPE "TransformationType" AS ENUM ('DIGITALE', 'RESTRUCTURATION', 'EXPANSION_GEOGRAPHIQUE', 'CHANGEMENT_ORGANISATIONNEL', 'FUSION', 'ACQUISITION', 'LANCEMENT_ACTIVITE');

-- CreateEnum
CREATE TYPE "TransformationPhase" AS ENUM ('DIAGNOSTIC', 'PLAN', 'TRANSFORMATION', 'ADOPTION', 'MESURE', 'AMELIORATION');

-- CreateEnum
CREATE TYPE "TransformationStatut" AS ENUM ('EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Transformation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TransformationType" NOT NULL,
    "description" TEXT,
    "phase" "TransformationPhase" NOT NULL DEFAULT 'DIAGNOSTIC',
    "statut" "TransformationStatut" NOT NULL DEFAULT 'EN_COURS',
    "departmentId" TEXT,
    "responsableId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transformation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transformation_departmentId_idx" ON "Transformation"("departmentId");

-- CreateIndex
CREATE INDEX "Transformation_statut_idx" ON "Transformation"("statut");

-- AddForeignKey
ALTER TABLE "Transformation" ADD CONSTRAINT "Transformation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transformation" ADD CONSTRAINT "Transformation_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transformation" ADD CONSTRAINT "Transformation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
