-- CreateEnum
CREATE TYPE "MECritere" AS ENUM ('PERTINENCE', 'EFFICACITE', 'EFFICIENCE', 'IMPACT', 'DURABILITE');

-- CreateTable
CREATE TABLE "ProjectMEEvaluation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT,
    "titre" TEXT NOT NULL,
    "dateEvaluation" TIMESTAMP(3) NOT NULL,
    "evaluateurNom" TEXT,
    "conclusions" TEXT,
    "recommandations" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMEEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMEEvaluationCritere" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "organizationId" TEXT,
    "critere" "MECritere" NOT NULL,
    "note" INTEGER,
    "commentaire" TEXT,

    CONSTRAINT "ProjectMEEvaluationCritere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMEEvaluation_projectId_idx" ON "ProjectMEEvaluation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMEEvaluationCritere_evaluationId_idx" ON "ProjectMEEvaluationCritere"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMEEvaluationCritere_evaluationId_critere_key" ON "ProjectMEEvaluationCritere"("evaluationId", "critere");

-- AddForeignKey
ALTER TABLE "ProjectMEEvaluation" ADD CONSTRAINT "ProjectMEEvaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMEEvaluation" ADD CONSTRAINT "ProjectMEEvaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMEEvaluation" ADD CONSTRAINT "ProjectMEEvaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMEEvaluationCritere" ADD CONSTRAINT "ProjectMEEvaluationCritere_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "ProjectMEEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMEEvaluationCritere" ADD CONSTRAINT "ProjectMEEvaluationCritere_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
