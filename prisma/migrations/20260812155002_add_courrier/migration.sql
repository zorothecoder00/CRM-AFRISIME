-- CreateEnum
CREATE TYPE "CourrierType" AS ENUM ('ENTRANT', 'SORTANT', 'INTERNE');

-- CreateEnum
CREATE TYPE "CourrierStatus" AS ENUM ('A_TRAITER', 'EN_COURS', 'TRAITE', 'ARCHIVE');

-- CreateTable
CREATE TABLE "Courrier" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "type" "CourrierType" NOT NULL,
    "statut" "CourrierStatus" NOT NULL DEFAULT 'A_TRAITER',
    "confidentiel" BOOLEAN NOT NULL DEFAULT false,
    "dateCourrier" TIMESTAMP(3) NOT NULL,
    "expediteur" TEXT,
    "destinataire" TEXT,
    "departmentId" TEXT,
    "responsableId" TEXT,
    "documentUrl" TEXT,
    "documentNom" TEXT,
    "notes" TEXT,
    "taskId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Courrier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Courrier_reference_key" ON "Courrier"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Courrier_taskId_key" ON "Courrier"("taskId");

-- CreateIndex
CREATE INDEX "Courrier_departmentId_idx" ON "Courrier"("departmentId");

-- CreateIndex
CREATE INDEX "Courrier_responsableId_idx" ON "Courrier"("responsableId");

-- CreateIndex
CREATE INDEX "Courrier_statut_idx" ON "Courrier"("statut");

-- CreateIndex
CREATE INDEX "Courrier_type_idx" ON "Courrier"("type");

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
