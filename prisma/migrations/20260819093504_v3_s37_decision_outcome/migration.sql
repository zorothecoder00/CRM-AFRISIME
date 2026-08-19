-- CreateTable
CREATE TABLE "DecisionOutcome" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "dateDecision" TIMESTAMP(3) NOT NULL,
    "dateEvaluationPrevue" TIMESTAMP(3),
    "objectifAtteint" BOOLEAN,
    "coutReel" DECIMAL(14,2),
    "delaiJours" INTEGER,
    "performance" TEXT,
    "incidents" TEXT,
    "roiPercent" DECIMAL(6,2),
    "enseignements" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "evaluatedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DecisionOutcome_sourceType_sourceId_idx" ON "DecisionOutcome"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "DecisionOutcome" ADD CONSTRAINT "DecisionOutcome_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionOutcome" ADD CONSTRAINT "DecisionOutcome_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
