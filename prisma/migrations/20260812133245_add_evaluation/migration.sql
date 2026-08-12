-- CreateEnum
CREATE TYPE "EvaluationPeriode" AS ENUM ('ANNUELLE', 'SEMESTRIELLE', 'TRIMESTRIELLE');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('BROUILLON', 'SOUMISE', 'ACCUSE_RECEPTION');

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "periode" "EvaluationPeriode" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "evalueId" TEXT NOT NULL,
    "evaluateurId" TEXT NOT NULL,
    "departmentId" TEXT,
    "pointsForts" TEXT,
    "axesAmelioration" TEXT,
    "commentaireEvaluateur" TEXT,
    "commentaireEvalue" TEXT,
    "scoreGlobal" DECIMAL(3,2),
    "statut" "EvaluationStatus" NOT NULL DEFAULT 'BROUILLON',
    "dateSoumission" TIMESTAMP(3),
    "dateAccuseReception" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCritere" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "note" DECIMAL(3,2) NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationCritere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evaluation_evalueId_idx" ON "Evaluation"("evalueId");

-- CreateIndex
CREATE INDEX "Evaluation_evaluateurId_idx" ON "Evaluation"("evaluateurId");

-- CreateIndex
CREATE INDEX "Evaluation_departmentId_idx" ON "Evaluation"("departmentId");

-- CreateIndex
CREATE INDEX "Evaluation_dateDebut_idx" ON "Evaluation"("dateDebut");

-- CreateIndex
CREATE INDEX "EvaluationCritere_evaluationId_idx" ON "EvaluationCritere"("evaluationId");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evalueId_fkey" FOREIGN KEY ("evalueId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluateurId_fkey" FOREIGN KEY ("evaluateurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCritere" ADD CONSTRAINT "EvaluationCritere_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
