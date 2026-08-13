-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('EN_COURS', 'TRAITEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "CompetenceNiveau" AS ENUM ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TACHE_CRITIQUE';

-- AlterTable
ALTER TABLE "MeetingDecision" ADD COLUMN     "motif" TEXT,
ADD COLUMN     "statut" "DecisionStatus" NOT NULL DEFAULT 'EN_COURS';

-- CreateTable
CREATE TABLE "Competence" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompetence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "niveau" "CompetenceNiveau" NOT NULL DEFAULT 'DEBUTANT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCompetence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Competence_nom_key" ON "Competence"("nom");

-- CreateIndex
CREATE INDEX "UserCompetence_userId_idx" ON "UserCompetence"("userId");

-- CreateIndex
CREATE INDEX "UserCompetence_competenceId_idx" ON "UserCompetence"("competenceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompetence_userId_competenceId_key" ON "UserCompetence"("userId", "competenceId");

-- AddForeignKey
ALTER TABLE "Competence" ADD CONSTRAINT "Competence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetence" ADD CONSTRAINT "UserCompetence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetence" ADD CONSTRAINT "UserCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

