-- CreateEnum
CREATE TYPE "GovernanceInstanceType" AS ENUM ('CONSEIL_ADMINISTRATION', 'COMITE_DIRECTION', 'COMITE_PILOTAGE', 'COMITE_TECHNIQUE', 'COMMISSION', 'GROUPE_TRAVAIL', 'COMITE_AD_HOC', 'AUTRE');

-- CreateEnum
CREATE TYPE "GovernanceMemberStatus" AS ENUM ('ACTIF', 'TERMINE', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "GovernanceDecisionPriorite" AS ENUM ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "ProcessusStatut" AS ENUM ('BROUILLON', 'ACTIF', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "ProcessusExecutionStatut" AS ENUM ('EN_COURS', 'TERMINE', 'REJETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "RiskCriticite" AS ENUM ('FAIBLE', 'MODERE', 'IMPORTANT', 'ELEVE', 'CRITIQUE');

-- CreateTable
CREATE TABLE "GovernanceInstance" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "GovernanceInstanceType" NOT NULL DEFAULT 'AUTRE',
    "description" TEXT,
    "estActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceInstanceMember" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fonction" TEXT,
    "role" TEXT,
    "mandat" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "statut" "GovernanceMemberStatus" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceInstanceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceMeeting" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "dateHeure" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "ordreDuJour" TEXT,
    "compteRendu" TEXT,
    "statut" "MeetingStatus" NOT NULL DEFAULT 'PLANIFIEE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceMeetingParticipant" (
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GovernanceMeetingParticipant_pkey" PRIMARY KEY ("meetingId","userId")
);

-- CreateTable
CREATE TABLE "GovernanceMeetingDocument" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceMeetingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceDecision" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "reference" TEXT,
    "objet" TEXT NOT NULL,
    "contexte" TEXT,
    "decision" TEXT NOT NULL,
    "responsableId" TEXT,
    "echeance" TIMESTAMP(3),
    "priorite" "GovernanceDecisionPriorite" NOT NULL DEFAULT 'MOYENNE',
    "statut" "DecisionStatus" NOT NULL DEFAULT 'EN_COURS',
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processus" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "processusParentId" TEXT,
    "responsableId" TEXT,
    "delaiJours" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "statut" "ProcessusStatut" NOT NULL DEFAULT 'BROUILLON',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessusEtape" (
    "id" TEXT NOT NULL,
    "processusId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "responsableId" TEXT,
    "delaiJours" INTEGER,
    "entrees" TEXT,
    "sorties" TEXT,
    "regles" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessusEtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessusVersion" (
    "id" TEXT NOT NULL,
    "processusId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessusVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessusExecution" (
    "id" TEXT NOT NULL,
    "processusId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "etapeActuelleId" TEXT,
    "statut" "ProcessusExecutionStatut" NOT NULL DEFAULT 'EN_COURS',
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessusExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessusExecutionEtape" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "etapeId" TEXT NOT NULL,
    "dateEntree" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSortie" TIMESTAMP(3),

    CONSTRAINT "ProcessusExecutionEtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessusDocument" (
    "id" TEXT NOT NULL,
    "processusId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessusDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalRisk" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT,
    "origine" TEXT,
    "probabilite" "RiskProbability" NOT NULL DEFAULT 'MOYENNE',
    "impact" "RiskImpact" NOT NULL DEFAULT 'MOYEN',
    "criticite" "RiskCriticite" NOT NULL,
    "responsableId" TEXT,
    "projectId" TEXT,
    "processusId" TEXT,
    "mesuresPreventives" TEXT,
    "planMitigation" TEXT,
    "echeance" TIMESTAMP(3),
    "statut" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalRisk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovernanceInstanceMember_instanceId_idx" ON "GovernanceInstanceMember"("instanceId");

-- CreateIndex
CREATE INDEX "GovernanceInstanceMember_userId_idx" ON "GovernanceInstanceMember"("userId");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_instanceId_idx" ON "GovernanceMeeting"("instanceId");

-- CreateIndex
CREATE INDEX "GovernanceMeetingDocument_meetingId_idx" ON "GovernanceMeetingDocument"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceDecision_taskId_key" ON "GovernanceDecision"("taskId");

-- CreateIndex
CREATE INDEX "GovernanceDecision_meetingId_idx" ON "GovernanceDecision"("meetingId");

-- CreateIndex
CREATE INDEX "Processus_processusParentId_idx" ON "Processus"("processusParentId");

-- CreateIndex
CREATE INDEX "ProcessusEtape_processusId_idx" ON "ProcessusEtape"("processusId");

-- CreateIndex
CREATE INDEX "ProcessusVersion_processusId_idx" ON "ProcessusVersion"("processusId");

-- CreateIndex
CREATE INDEX "ProcessusExecution_processusId_idx" ON "ProcessusExecution"("processusId");

-- CreateIndex
CREATE INDEX "ProcessusExecution_statut_idx" ON "ProcessusExecution"("statut");

-- CreateIndex
CREATE INDEX "ProcessusExecutionEtape_executionId_idx" ON "ProcessusExecutionEtape"("executionId");

-- CreateIndex
CREATE INDEX "ProcessusExecutionEtape_etapeId_idx" ON "ProcessusExecutionEtape"("etapeId");

-- CreateIndex
CREATE INDEX "ProcessusDocument_processusId_idx" ON "ProcessusDocument"("processusId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationalRisk_code_key" ON "OrganizationalRisk"("code");

-- CreateIndex
CREATE INDEX "OrganizationalRisk_projectId_idx" ON "OrganizationalRisk"("projectId");

-- CreateIndex
CREATE INDEX "OrganizationalRisk_processusId_idx" ON "OrganizationalRisk"("processusId");

-- CreateIndex
CREATE INDEX "OrganizationalRisk_statut_idx" ON "OrganizationalRisk"("statut");

-- AddForeignKey
ALTER TABLE "GovernanceInstance" ADD CONSTRAINT "GovernanceInstance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceInstanceMember" ADD CONSTRAINT "GovernanceInstanceMember_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "GovernanceInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceInstanceMember" ADD CONSTRAINT "GovernanceInstanceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "GovernanceInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeetingParticipant" ADD CONSTRAINT "GovernanceMeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeetingParticipant" ADD CONSTRAINT "GovernanceMeetingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeetingDocument" ADD CONSTRAINT "GovernanceMeetingDocument_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceMeetingDocument" ADD CONSTRAINT "GovernanceMeetingDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processus" ADD CONSTRAINT "Processus_processusParentId_fkey" FOREIGN KEY ("processusParentId") REFERENCES "Processus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processus" ADD CONSTRAINT "Processus_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processus" ADD CONSTRAINT "Processus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusEtape" ADD CONSTRAINT "ProcessusEtape_processusId_fkey" FOREIGN KEY ("processusId") REFERENCES "Processus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusEtape" ADD CONSTRAINT "ProcessusEtape_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusVersion" ADD CONSTRAINT "ProcessusVersion_processusId_fkey" FOREIGN KEY ("processusId") REFERENCES "Processus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusVersion" ADD CONSTRAINT "ProcessusVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusExecution" ADD CONSTRAINT "ProcessusExecution_processusId_fkey" FOREIGN KEY ("processusId") REFERENCES "Processus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusExecution" ADD CONSTRAINT "ProcessusExecution_etapeActuelleId_fkey" FOREIGN KEY ("etapeActuelleId") REFERENCES "ProcessusEtape"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusExecution" ADD CONSTRAINT "ProcessusExecution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusExecutionEtape" ADD CONSTRAINT "ProcessusExecutionEtape_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ProcessusExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusExecutionEtape" ADD CONSTRAINT "ProcessusExecutionEtape_etapeId_fkey" FOREIGN KEY ("etapeId") REFERENCES "ProcessusEtape"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusDocument" ADD CONSTRAINT "ProcessusDocument_processusId_fkey" FOREIGN KEY ("processusId") REFERENCES "Processus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessusDocument" ADD CONSTRAINT "ProcessusDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalRisk" ADD CONSTRAINT "OrganizationalRisk_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalRisk" ADD CONSTRAINT "OrganizationalRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalRisk" ADD CONSTRAINT "OrganizationalRisk_processusId_fkey" FOREIGN KEY ("processusId") REFERENCES "Processus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalRisk" ADD CONSTRAINT "OrganizationalRisk_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
