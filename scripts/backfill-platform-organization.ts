import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Multi-tenant Phase 1 (V3.0 §27, plan Phase 1 + lots 2-16) — rattache toutes
 * les lignes existantes (sans organizationId) des modeles couverts par le
 * retrofit multi-tenant a une PlatformOrganization "AfriSime", conformement
 * a la decision actee le 2026-08-20 : les donnees actuelles de ce
 * deploiement deviennent l'organisation n°1. Idempotent (upsert sur le slug
 * + where organizationId IS NULL) — relancer ce script ne cree pas de
 * doublon et ne re-rattache pas des lignes deja assignees a une autre
 * organisation.
 *
 * Liste MODELS etendue a chaque nouveau lot — voir prisma/schema.prisma
 * pour l'etat courant des modeles couverts.
 *
 * Usage :
 *   DATABASE_URL="<url>" npx tsx scripts/backfill-platform-organization.ts
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MODELS = [
  { label: "Utilisateurs", client: prisma.user },
  { label: "Départements", client: prisma.department },
  { label: "Équipes", client: prisma.team },
  { label: "Projets", client: prisma.project },
  { label: "Tâches", client: prisma.task },
  { label: "Phases/lots", client: prisma.projectSection },
  { label: "Documents", client: prisma.document },
  { label: "Réunions", client: prisma.meeting },
  { label: "Dossiers de documents", client: prisma.documentFolder },
  { label: "Tableaux blancs", client: prisma.whiteboard },
  { label: "Membres de projet", client: prisma.projectMember },
  { label: "Risques projet", client: prisma.projectRisk },
  { label: "Jalons", client: prisma.projectMilestone },
  { label: "Livrables", client: prisma.projectDeliverable },
  { label: "Ressources projet", client: prisma.projectResource },
  { label: "Commentaires de section", client: prisma.sectionComment },
  { label: "Affectations de tâche", client: prisma.taskAssignee },
  { label: "Éléments de checklist", client: prisma.checklistItem },
  { label: "Commentaires de tâche", client: prisma.taskComment },
  { label: "Dépendances de tâche", client: prisma.taskDependency },
  { label: "Accès document", client: prisma.documentAccess },
  { label: "Versions de document", client: prisma.documentVersion },
  { label: "Participants de réunion", client: prisma.meetingParticipant },
  { label: "Décisions de réunion", client: prisma.meetingDecision },
  { label: "Participants externes de réunion", client: prisma.meetingExternalParticipant },
  { label: "Compétences", client: prisma.competence },
  { label: "Compétences utilisateur", client: prisma.userCompetence },
  { label: "Catégories de connaissance", client: prisma.knowledgeCategory },
  { label: "Articles de connaissance", client: prisma.knowledgeArticle },
  { label: "Congés", client: prisma.leave },
  { label: "Événements", client: prisma.event },
  { label: "Objectifs", client: prisma.objective },
  { label: "Indicateurs", client: prisma.indicator },
  { label: "Évaluations", client: prisma.evaluation },
  { label: "Critères d'évaluation", client: prisma.evaluationCritere },
  { label: "Conversations", client: prisma.conversation },
  { label: "Participants de conversation", client: prisma.conversationParticipant },
  { label: "Messages", client: prisma.message },
  { label: "Réactions", client: prisma.reaction },
  { label: "Notifications", client: prisma.notification },
  // Cluster CRM (lot 10) — champ platformOrganizationId (pas organizationId,
  // deja pris par le sens CRM existant sur ces tables : voir
  // prisma/schema.prisma).
  { label: "Organisations CRM", client: prisma.crmOrganization, field: "platformOrganizationId" },
  { label: "Contacts CRM", client: prisma.crmContact, field: "platformOrganizationId" },
  { label: "Comptes portail", client: prisma.portalAccount, field: "platformOrganizationId" },
  { label: "Tokens d'invitation portail", client: prisma.portalInviteToken, field: "platformOrganizationId" },
  { label: "Opportunités CRM", client: prisma.crmOpportunity, field: "platformOrganizationId" },
  { label: "Interactions CRM", client: prisma.crmInteraction, field: "platformOrganizationId" },
  { label: "Contrats", client: prisma.contract, field: "platformOrganizationId" },
  { label: "Messages portail", client: prisma.portalMessage, field: "platformOrganizationId" },
  { label: "Décisions (Decision Intelligence)", client: prisma.decisionOutcome },
  { label: "Postes", client: prisma.poste },
  { label: "Responsabilités de poste", client: prisma.posteResponsabilite },
  { label: "Plans de succession", client: prisma.successionPlan },
  { label: "Candidats de succession", client: prisma.successionCandidate },
  { label: "Sites", client: prisma.site },
  { label: "Délégations", client: prisma.delegation },
  { label: "Axes stratégiques", client: prisma.strategicAxis },
  { label: "Éléments SWOT", client: prisma.swotItem },
  { label: "Plans", client: prisma.plan },
  { label: "Programmes", client: prisma.programme },
  { label: "Risques programme", client: prisma.programmeRisk },
  { label: "Instances de gouvernance", client: prisma.governanceInstance },
  { label: "Membres d'instance de gouvernance", client: prisma.governanceInstanceMember },
  { label: "Réunions de gouvernance", client: prisma.governanceMeeting },
  { label: "Participants de réunion de gouvernance", client: prisma.governanceMeetingParticipant },
  { label: "Documents de réunion de gouvernance", client: prisma.governanceMeetingDocument },
  { label: "Décisions de gouvernance", client: prisma.governanceDecision },
  { label: "Processus", client: prisma.processus },
  { label: "Étapes de processus", client: prisma.processusEtape },
  { label: "Versions de processus", client: prisma.processusVersion },
  { label: "Exécutions de processus", client: prisma.processusExecution },
  { label: "Étapes d'exécution de processus", client: prisma.processusExecutionEtape },
  { label: "Documents de processus", client: prisma.processusDocument },
  { label: "Risques organisationnels", client: prisma.organizationalRisk },
  { label: "Obligations de conformité", client: prisma.complianceObligation },
  { label: "Contrôles de conformité", client: prisma.complianceControl },
  { label: "Documents d'obligation de conformité", client: prisma.complianceObligationDocument },
  { label: "Non-conformités", client: prisma.nonConformite },
  { label: "Actions de non-conformité", client: prisma.nonConformiteAction },
  { label: "Documents qualité", client: prisma.qualityDocument },
  { label: "Contrôles qualité", client: prisma.qualityControl },
  { label: "Éléments de checklist qualité", client: prisma.qualityChecklistItem },
  { label: "Réclamations qualité", client: prisma.qualityClaim },
  { label: "Plans d'audit", client: prisma.auditPlan },
  { label: "Membres de plan d'audit", client: prisma.auditPlanMember },
  { label: "Documents de plan d'audit", client: prisma.auditPlanDocument },
  { label: "Missions d'audit", client: prisma.auditMission },
  { label: "Constats d'audit", client: prisma.auditFinding },
  { label: "Incidents", client: prisma.incident },
  { label: "Demandes de changement", client: prisma.changeRequest },
  { label: "Circuits de validation", client: prisma.validationWorkflow },
  { label: "Étapes de circuit de validation", client: prisma.validationWorkflowStep },
  { label: "Instances de validation de tâche", client: prisma.taskValidationRun },
  { label: "Approbations de tâche", client: prisma.taskApproval },
  { label: "Demandes administratives", client: prisma.adminRequest },
  { label: "Instances de validation de demande admin", client: prisma.adminRequestValidationRun },
  { label: "Approbations de demande admin", client: prisma.adminRequestApproval },
  { label: "Courriers", client: prisma.courrier },
  { label: "Conditions d'automatisation", client: prisma.automationCondition },
  { label: "Playbooks d'orchestration", client: prisma.orchestrationPlaybook },
  { label: "Règles d'automatisation", client: prisma.automationRule },
  { label: "Exécutions d'automatisation", client: prisma.automationExecution },
  { label: "Actions IA en attente", client: prisma.pendingAiAction },
  { label: "Brouillons de design organisationnel", client: prisma.orgDesignDraft },
  { label: "Classifications de données", client: prisma.dataClassification },
  { label: "Transformations", client: prisma.transformation },
  { label: "Entrées de mémoire organisationnelle", client: prisma.organizationalMemoryEntry },
  { label: "Matrices de décision", client: prisma.decisionMatrix },
  { label: "Options de décision", client: prisma.decisionOption },
  { label: "Journaux d'audit", client: prisma.auditLog },
  { label: "Intégrations", client: prisma.integration },
  { label: "Événements d'intégration", client: prisma.integrationEvent },
  { label: "Préférences de tableau de bord", client: prisma.dashboardWidgetPreference },
  { label: "Insights agents IA", client: prisma.aiAgentInsight },
  { label: "Instantanés de métriques", client: prisma.metricSnapshot },
  { label: "Dépendances", client: prisma.dependency },
  { label: "Scénarios", client: prisma.scenario },
  { label: "Bénéficiaires", client: prisma.beneficiaire },
  { label: "Entités", client: prisma.entity },
  { label: "Jours fériés", client: prisma.holiday },
  { label: "Tags", client: prisma.tag },
  { label: "Tags d'entité", client: prisma.entityTag },
  { label: "Clés API", client: prisma.apiKey },
] as const;

async function main() {
  // N'importe quel utilisateur existant convient comme createdBy — le
  // registre PlatformOrganization exige un createdById mais ne prejuge pas
  // du role de ce createur.
  const anyUser = await prisma.user.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

  const afrisime = await prisma.platformOrganization.upsert({
    where: { slug: "afrisime" },
    update: {},
    create: {
      nom: "AfriSime",
      slug: "afrisime",
      createdById: anyUser.id,
    },
  });

  console.log(`PlatformOrganization "AfriSime" (id: ${afrisime.id})`);

  for (const entry of MODELS) {
    const field = "field" in entry ? entry.field : "organizationId";
    // @ts-expect-error -- updateMany existe sur tous les delegates Prisma listes ci-dessus
    const result = await entry.client.updateMany({
      where: { [field]: null },
      data: { [field]: afrisime.id },
    });
    console.log(`  ${entry.label} rattachés : ${result.count}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
