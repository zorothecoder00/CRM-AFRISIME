-- CreateEnum
CREATE TYPE "ProjectIdeaStatus" AS ENUM ('IDEE', 'A_ETUDIER', 'ETUDE_FAISABILITE', 'APPROUVEE', 'EN_CONCEPTION', 'PROJET_CREE', 'REJETEE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "FinancementStatut" AS ENUM ('RECHERCHE', 'NEGOCIATION', 'OBTENU', 'REFUSE', 'ANNULE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "pays" TEXT;

-- CreateTable
CREATE TABLE "ProjectIdea" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "titreProvisoire" TEXT NOT NULL,
    "origine" TEXT,
    "probleme" TEXT,
    "opportunite" TEXT,
    "beneficiaires" TEXT,
    "zone" TEXT,
    "porteurId" TEXT,
    "departmentId" TEXT,
    "estimationBudgetaire" DECIMAL(14,2),
    "dureeEstimee" TEXT,
    "priorite" "ProjectPriority" NOT NULL DEFAULT 'MOYENNE',
    "sourceFinancementPotentielle" TEXT,
    "statut" "ProjectIdeaStatus" NOT NULL DEFAULT 'IDEE',
    "motifRejet" TEXT,
    "convertedProjectId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectConceptNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "ideaId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contexte" TEXT,
    "probleme" TEXT,
    "justification" TEXT,
    "objectifs" TEXT,
    "beneficiaires" TEXT,
    "approche" TEXT,
    "resultatsAttendus" TEXT,
    "duree" TEXT,
    "budgetIndicatif" DECIMAL(14,2),
    "partenaires" TEXT,
    "financementRecherche" DECIMAL(14,2),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectConceptNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "bailleur" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "statut" "FinancementStatut" NOT NULL DEFAULT 'RECHERCHE',
    "dateObtention" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Financement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectIdea_convertedProjectId_key" ON "ProjectIdea"("convertedProjectId");

-- CreateIndex
CREATE INDEX "ProjectIdea_statut_idx" ON "ProjectIdea"("statut");

-- CreateIndex
CREATE INDEX "ProjectIdea_departmentId_idx" ON "ProjectIdea"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectConceptNote_ideaId_key" ON "ProjectConceptNote"("ideaId");

-- CreateIndex
CREATE INDEX "Financement_projectId_idx" ON "Financement"("projectId");

-- CreateIndex
CREATE INDEX "Financement_statut_idx" ON "Financement"("statut");

-- AddForeignKey
ALTER TABLE "ProjectIdea" ADD CONSTRAINT "ProjectIdea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIdea" ADD CONSTRAINT "ProjectIdea_porteurId_fkey" FOREIGN KEY ("porteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIdea" ADD CONSTRAINT "ProjectIdea_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIdea" ADD CONSTRAINT "ProjectIdea_convertedProjectId_fkey" FOREIGN KEY ("convertedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIdea" ADD CONSTRAINT "ProjectIdea_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectConceptNote" ADD CONSTRAINT "ProjectConceptNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectConceptNote" ADD CONSTRAINT "ProjectConceptNote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ProjectIdea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectConceptNote" ADD CONSTRAINT "ProjectConceptNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financement" ADD CONSTRAINT "Financement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financement" ADD CONSTRAINT "Financement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financement" ADD CONSTRAINT "Financement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
