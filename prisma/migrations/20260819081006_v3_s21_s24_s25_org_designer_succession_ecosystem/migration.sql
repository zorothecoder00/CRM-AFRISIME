-- CreateEnum
CREATE TYPE "OrgDesignStatut" AS ENUM ('BROUILLON', 'SIMULE', 'DEPLOYE');

-- CreateEnum
CREATE TYPE "SuccessionPlanStatut" AS ENUM ('EN_PREPARATION', 'PRET', 'ACTIF');

-- CreateEnum
CREATE TYPE "PotentielNiveau" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE');

-- AlterEnum
ALTER TYPE "CrmContactType" ADD VALUE 'COMMUNAUTE';

-- AlterTable
ALTER TABLE "PortalAccount" ADD COLUMN     "droitDocuments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "droitMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "droitProjets" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "droitTeleversement" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Poste" ADD COLUMN     "critique" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrgDesignDraft" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "structure" JSONB NOT NULL,
    "statut" "OrgDesignStatut" NOT NULL DEFAULT 'BROUILLON',
    "simulationResume" JSONB,
    "deployedDepartmentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "simulatedAt" TIMESTAMP(3),
    "deployedAt" TIMESTAMP(3),

    CONSTRAINT "OrgDesignDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessionPlan" (
    "id" TEXT NOT NULL,
    "posteId" TEXT NOT NULL,
    "titulaireId" TEXT,
    "competencesRequises" TEXT,
    "statut" "SuccessionPlanStatut" NOT NULL DEFAULT 'EN_PREPARATION',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessionCandidate" (
    "id" TEXT NOT NULL,
    "successionPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "potentiel" "PotentielNiveau" NOT NULL DEFAULT 'MOYEN',
    "pretDans" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuccessionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgDesignDraft_deployedDepartmentId_idx" ON "OrgDesignDraft"("deployedDepartmentId");

-- CreateIndex
CREATE INDEX "SuccessionPlan_posteId_idx" ON "SuccessionPlan"("posteId");

-- CreateIndex
CREATE INDEX "SuccessionPlan_titulaireId_idx" ON "SuccessionPlan"("titulaireId");

-- CreateIndex
CREATE INDEX "SuccessionCandidate_successionPlanId_idx" ON "SuccessionCandidate"("successionPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessionCandidate_successionPlanId_userId_key" ON "SuccessionCandidate"("successionPlanId", "userId");

-- AddForeignKey
ALTER TABLE "OrgDesignDraft" ADD CONSTRAINT "OrgDesignDraft_deployedDepartmentId_fkey" FOREIGN KEY ("deployedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgDesignDraft" ADD CONSTRAINT "OrgDesignDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_titulaireId_fkey" FOREIGN KEY ("titulaireId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionCandidate" ADD CONSTRAINT "SuccessionCandidate_successionPlanId_fkey" FOREIGN KEY ("successionPlanId") REFERENCES "SuccessionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionCandidate" ADD CONSTRAINT "SuccessionCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
