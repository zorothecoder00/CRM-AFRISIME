-- CreateEnum
CREATE TYPE "AutomationConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS');

-- CreateEnum
CREATE TYPE "AutomationConditionConnector" AS ENUM ('ET', 'OU');

-- CreateEnum
CREATE TYPE "ComplianceObligationType" AS ENUM ('REGLEMENTAIRE', 'CONTRACTUELLE');

-- CreateEnum
CREATE TYPE "ComplianceObligationStatut" AS ENUM ('A_VENIR', 'A_JOUR', 'EN_RETARD', 'NON_CONFORME');

-- CreateEnum
CREATE TYPE "ComplianceControlResultat" AS ENUM ('CONFORME', 'NON_CONFORME');

-- CreateEnum
CREATE TYPE "NonConformiteSource" AS ENUM ('CONFORMITE', 'QUALITE');

-- CreateEnum
CREATE TYPE "NonConformiteStatut" AS ENUM ('OUVERTE', 'EN_ANALYSE', 'EN_TRAITEMENT', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "NonConformiteActionType" AS ENUM ('CORRECTIVE', 'PREVENTIVE');

-- CreateEnum
CREATE TYPE "NonConformiteActionStatut" AS ENUM ('A_FAIRE', 'EN_COURS', 'FAITE', 'VERIFIEE');

-- CreateEnum
CREATE TYPE "QualityDocumentType" AS ENUM ('POLITIQUE', 'PROCEDURE', 'STANDARD');

-- CreateEnum
CREATE TYPE "QualityDocumentStatut" AS ENUM ('BROUILLON', 'PUBLIE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "QualityClaimStatut" AS ENUM ('OUVERTE', 'EN_TRAITEMENT', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "AuditMissionStatut" AS ENUM ('PREPARATION', 'COLLECTE', 'VERIFICATION', 'RAPPORT', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "AuditFindingStatut" AS ENUM ('OUVERT', 'EN_COURS', 'TRAITE', 'CLOS');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('ORGANISATIONNEL', 'INFORMATIQUE', 'CLIENT', 'PROJET', 'QUALITE', 'SECURITE', 'OPERATIONNEL');

-- CreateEnum
CREATE TYPE "IncidentStatut" AS ENUM ('DECLARE', 'QUALIFIE', 'AFFECTE', 'EN_TRAITEMENT', 'VALIDE', 'CLOTURE');

-- CreateEnum
CREATE TYPE "ChangeRequestStatut" AS ENUM ('DEMANDE', 'ANALYSE', 'VALIDATION', 'PLANIFICATION', 'DEPLOIEMENT', 'CLOTURE', 'REJETE');

-- CreateEnum
CREATE TYPE "AiAgentType" AS ENUM ('PROJECT_MANAGER', 'CRM_MANAGER', 'RISK_MANAGER', 'ANALYST', 'ADMINISTRATIVE_ASSISTANT', 'STRATEGY_ADVISOR');

-- CreateEnum
CREATE TYPE "AiInsightType" AS ENUM ('ALERTE', 'RECOMMANDATION', 'RAPPORT', 'ANOMALIE');

-- CreateEnum
CREATE TYPE "AiInsightStatut" AS ENUM ('NOUVEAU', 'VU', 'TRAITE', 'IGNORE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationActionType" ADD VALUE 'ASSIGN_USER';
ALTER TYPE "AutomationActionType" ADD VALUE 'SEND_EMAIL';
ALTER TYPE "AutomationActionType" ADD VALUE 'CHANGE_STATUS';
ALTER TYPE "AutomationActionType" ADD VALUE 'CREATE_MEETING';
ALTER TYPE "AutomationActionType" ADD VALUE 'CREATE_ADMIN_REQUEST';
ALTER TYPE "AutomationActionType" ADD VALUE 'CREATE_RISK';
ALTER TYPE "AutomationActionType" ADD VALUE 'GENERATE_REPORT';
ALTER TYPE "AutomationActionType" ADD VALUE 'REQUEST_VALIDATION';
ALTER TYPE "AutomationActionType" ADD VALUE 'TRIGGER_WORKFLOW';
ALTER TYPE "AutomationActionType" ADD VALUE 'VERIFY_RESOURCES';
ALTER TYPE "AutomationActionType" ADD VALUE 'VERIFY_RISKS';
ALTER TYPE "AutomationActionType" ADD VALUE 'OPEN_TRACKING_BOARD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationTrigger" ADD VALUE 'TASK_CREATED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'TASK_STATUS_CHANGED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'PROJECT_STATUS_CHANGED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'OPPORTUNITY_CREATED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'RISK_CREATED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'DECISION_CREATED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'MEETING_CREATED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'EVENT_CREATED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'INDICATOR_OFF_TARGET';

-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'PRET_POUR_EXECUTION';

-- DropForeignKey
ALTER TABLE "AutomationRule" DROP CONSTRAINT "AutomationRule_projectId_fkey";

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "adminRequestTitre" TEXT,
ADD COLUMN     "adminRequestType" "AdminRequestType",
ADD COLUMN     "assignUserId" TEXT,
ADD COLUMN     "changeStatusValue" TEXT,
ADD COLUMN     "meetingDelaiJours" INTEGER,
ADD COLUMN     "meetingTitre" TEXT,
ADD COLUMN     "ordre" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "playbookId" TEXT,
ADD COLUMN     "reportType" TEXT,
ADD COLUMN     "riskImpact" "RiskImpact",
ADD COLUMN     "riskProbabilite" "RiskProbability",
ADD COLUMN     "riskTitre" TEXT,
ADD COLUMN     "targetRuleId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AutomationCondition" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "champ" TEXT NOT NULL,
    "operateur" "AutomationConditionOperator" NOT NULL,
    "valeur" TEXT NOT NULL,
    "connecteur" "AutomationConditionConnector" NOT NULL DEFAULT 'ET',
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AutomationCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationPlaybook" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "AutomationTrigger" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceObligation" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" "ComplianceObligationType" NOT NULL DEFAULT 'REGLEMENTAIRE',
    "echeance" TIMESTAMP(3),
    "responsableId" TEXT,
    "statut" "ComplianceObligationStatut" NOT NULL DEFAULT 'A_VENIR',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceControl" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultat" "ComplianceControlResultat" NOT NULL,
    "preuveUrl" TEXT,
    "commentaire" TEXT,
    "controleParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceObligationDocument" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceObligationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformite" (
    "id" TEXT NOT NULL,
    "source" "NonConformiteSource" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "obligationId" TEXT,
    "analyse" TEXT,
    "statut" "NonConformiteStatut" NOT NULL DEFAULT 'OUVERTE',
    "detecteeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonConformite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformiteAction" (
    "id" TEXT NOT NULL,
    "nonConformiteId" TEXT NOT NULL,
    "type" "NonConformiteActionType" NOT NULL DEFAULT 'CORRECTIVE',
    "description" TEXT NOT NULL,
    "responsableId" TEXT,
    "echeance" TIMESTAMP(3),
    "statut" "NonConformiteActionStatut" NOT NULL DEFAULT 'A_FAIRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonConformiteAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityDocument" (
    "id" TEXT NOT NULL,
    "type" "QualityDocumentType" NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "statut" "QualityDocumentStatut" NOT NULL DEFAULT 'BROUILLON',
    "responsableId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityControl" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "dateControle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultat" "ComplianceControlResultat" NOT NULL,
    "commentaire" TEXT,
    "controleParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityChecklistItem" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QualityChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityClaim" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contactId" TEXT,
    "responsableId" TEXT,
    "statut" "QualityClaimStatut" NOT NULL DEFAULT 'OUVERTE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPlan" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "perimetre" TEXT,
    "objectifs" TEXT,
    "criteres" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPlanMember" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuditPlanMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPlanDocument" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPlanDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditMission" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "statut" "AuditMissionStatut" NOT NULL DEFAULT 'PREPARATION',
    "rapport" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "constat" TEXT NOT NULL,
    "recommandation" TEXT,
    "responsableId" TEXT,
    "echeance" TIMESTAMP(3),
    "statut" "AuditFindingStatut" NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "criticite" "RiskCriticite" NOT NULL DEFAULT 'MODERE',
    "statut" "IncidentStatut" NOT NULL DEFAULT 'DECLARE',
    "projectId" TEXT,
    "assigneId" TEXT,
    "analyseCause" TEXT,
    "estEscalade" BOOLEAN NOT NULL DEFAULT false,
    "escaladeAId" TEXT,
    "declareParId" TEXT NOT NULL,
    "dateDeclaration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCloture" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "analyseImpact" TEXT,
    "statut" "ChangeRequestStatut" NOT NULL DEFAULT 'DEMANDE',
    "demandeParId" TEXT NOT NULL,
    "validateParId" TEXT,
    "dateValidation" TIMESTAMP(3),
    "datePlanifiee" TIMESTAMP(3),
    "dateDeploiement" TIMESTAMP(3),
    "planCommunication" TEXT,
    "planFormation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentInsight" (
    "id" TEXT NOT NULL,
    "agent" "AiAgentType" NOT NULL,
    "type" "AiInsightType" NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "statut" "AiInsightStatut" NOT NULL DEFAULT 'NOUVEAU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAgentInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TaskCompetencesRequises" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskCompetencesRequises_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "AutomationCondition_ruleId_idx" ON "AutomationCondition"("ruleId");

-- CreateIndex
CREATE INDEX "OrchestrationPlaybook_trigger_idx" ON "OrchestrationPlaybook"("trigger");

-- CreateIndex
CREATE INDEX "OrchestrationPlaybook_projectId_idx" ON "OrchestrationPlaybook"("projectId");

-- CreateIndex
CREATE INDEX "ComplianceObligation_statut_idx" ON "ComplianceObligation"("statut");

-- CreateIndex
CREATE INDEX "ComplianceObligation_echeance_idx" ON "ComplianceObligation"("echeance");

-- CreateIndex
CREATE INDEX "ComplianceControl_obligationId_idx" ON "ComplianceControl"("obligationId");

-- CreateIndex
CREATE INDEX "ComplianceObligationDocument_obligationId_idx" ON "ComplianceObligationDocument"("obligationId");

-- CreateIndex
CREATE INDEX "NonConformite_source_idx" ON "NonConformite"("source");

-- CreateIndex
CREATE INDEX "NonConformite_obligationId_idx" ON "NonConformite"("obligationId");

-- CreateIndex
CREATE INDEX "NonConformite_statut_idx" ON "NonConformite"("statut");

-- CreateIndex
CREATE INDEX "NonConformiteAction_nonConformiteId_idx" ON "NonConformiteAction"("nonConformiteId");

-- CreateIndex
CREATE INDEX "QualityDocument_type_idx" ON "QualityDocument"("type");

-- CreateIndex
CREATE INDEX "QualityChecklistItem_controlId_idx" ON "QualityChecklistItem"("controlId");

-- CreateIndex
CREATE INDEX "QualityClaim_statut_idx" ON "QualityClaim"("statut");

-- CreateIndex
CREATE INDEX "QualityClaim_contactId_idx" ON "QualityClaim"("contactId");

-- CreateIndex
CREATE INDEX "AuditPlanMember_planId_idx" ON "AuditPlanMember"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPlanMember_planId_userId_key" ON "AuditPlanMember"("planId", "userId");

-- CreateIndex
CREATE INDEX "AuditPlanDocument_planId_idx" ON "AuditPlanDocument"("planId");

-- CreateIndex
CREATE INDEX "AuditMission_planId_idx" ON "AuditMission"("planId");

-- CreateIndex
CREATE INDEX "AuditFinding_missionId_idx" ON "AuditFinding"("missionId");

-- CreateIndex
CREATE INDEX "Incident_statut_idx" ON "Incident"("statut");

-- CreateIndex
CREATE INDEX "Incident_type_idx" ON "Incident"("type");

-- CreateIndex
CREATE INDEX "Incident_projectId_idx" ON "Incident"("projectId");

-- CreateIndex
CREATE INDEX "ChangeRequest_statut_idx" ON "ChangeRequest"("statut");

-- CreateIndex
CREATE INDEX "AiAgentInsight_agent_idx" ON "AiAgentInsight"("agent");

-- CreateIndex
CREATE INDEX "AiAgentInsight_statut_idx" ON "AiAgentInsight"("statut");

-- CreateIndex
CREATE INDEX "AiAgentInsight_entityType_entityId_idx" ON "AiAgentInsight"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "_TaskCompetencesRequises_B_index" ON "_TaskCompetencesRequises"("B");

-- CreateIndex
CREATE INDEX "AutomationRule_playbookId_idx" ON "AutomationRule"("playbookId");

-- AddForeignKey
ALTER TABLE "AutomationCondition" ADD CONSTRAINT "AutomationCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationPlaybook" ADD CONSTRAINT "OrchestrationPlaybook_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationPlaybook" ADD CONSTRAINT "OrchestrationPlaybook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "OrchestrationPlaybook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_assignUserId_fkey" FOREIGN KEY ("assignUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_targetRuleId_fkey" FOREIGN KEY ("targetRuleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "ComplianceObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_controleParId_fkey" FOREIGN KEY ("controleParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligationDocument" ADD CONSTRAINT "ComplianceObligationDocument_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "ComplianceObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligationDocument" ADD CONSTRAINT "ComplianceObligationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "ComplianceObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_detecteeParId_fkey" FOREIGN KEY ("detecteeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformiteAction" ADD CONSTRAINT "NonConformiteAction_nonConformiteId_fkey" FOREIGN KEY ("nonConformiteId") REFERENCES "NonConformite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformiteAction" ADD CONSTRAINT "NonConformiteAction_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityDocument" ADD CONSTRAINT "QualityDocument_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityDocument" ADD CONSTRAINT "QualityDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_controleParId_fkey" FOREIGN KEY ("controleParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityChecklistItem" ADD CONSTRAINT "QualityChecklistItem_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "QualityControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityClaim" ADD CONSTRAINT "QualityClaim_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityClaim" ADD CONSTRAINT "QualityClaim_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityClaim" ADD CONSTRAINT "QualityClaim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlan" ADD CONSTRAINT "AuditPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlanMember" ADD CONSTRAINT "AuditPlanMember_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AuditPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlanMember" ADD CONSTRAINT "AuditPlanMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlanDocument" ADD CONSTRAINT "AuditPlanDocument_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AuditPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlanDocument" ADD CONSTRAINT "AuditPlanDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditMission" ADD CONSTRAINT "AuditMission_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AuditPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditMission" ADD CONSTRAINT "AuditMission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "AuditMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assigneId_fkey" FOREIGN KEY ("assigneId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_escaladeAId_fkey" FOREIGN KEY ("escaladeAId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_declareParId_fkey" FOREIGN KEY ("declareParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_demandeParId_fkey" FOREIGN KEY ("demandeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_validateParId_fkey" FOREIGN KEY ("validateParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskCompetencesRequises" ADD CONSTRAINT "_TaskCompetencesRequises_A_fkey" FOREIGN KEY ("A") REFERENCES "Competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskCompetencesRequises" ADD CONSTRAINT "_TaskCompetencesRequises_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
