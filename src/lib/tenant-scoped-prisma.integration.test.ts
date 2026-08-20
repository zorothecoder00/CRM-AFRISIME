import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { withTenantScope } from "@/lib/tenant-scoped-prisma";

/**
 * Multi-tenant Phase 3 — preuve de concept RLS, contre une VRAIE base (pas de
 * mock, conformément à la règle du projet), avec un VRAI rôle Postgres non-
 * propriétaire (seul moyen de tester une politique RLS pour de vrai — voir
 * tenant-scoped-prisma.ts). Prérequis local, une seule fois :
 *
 *   npx tsx scripts/setup-local-rls-test-role.ts
 *
 * Séparé des tests rapides (*.test.ts) sous *.integration.test.ts, exclu du
 * `npm test` par défaut (voir vitest.config.mts) — lancé via
 * `npm run test:integration`.
 */

const TENANT_ROLE_CONNECTION_STRING =
  "postgresql://afriflow_tenant_scoped:afriflow_tenant_scoped_local_test_only@localhost:5432/afriflow?schema=public";

const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

let orgA: { id: string };
let orgB: { id: string };
let userA: { id: string };
let userB: { id: string };
let deptA: { id: string };
let deptB: { id: string };
let teamA: { id: string };
let teamB: { id: string };
let projectA: { id: string };
let projectB: { id: string };
let taskA: { id: string };
let taskB: { id: string };
let sectionA: { id: string };
let sectionB: { id: string };
let docA: { id: string };
let docB: { id: string };
let meetingA: { id: string };
let meetingB: { id: string };
let folderA: { id: string };
let folderB: { id: string };
let whiteboardA: { id: string };
let whiteboardB: { id: string };
let projectMemberA: { id: string };
let projectMemberB: { id: string };
let riskA: { id: string };
let riskB: { id: string };
let milestoneA: { id: string };
let milestoneB: { id: string };
let deliverableA: { id: string };
let deliverableB: { id: string };
let resourceA: { id: string };
let resourceB: { id: string };
let sectionCommentA: { id: string };
let sectionCommentB: { id: string };
let taskA2: { id: string };
let taskB2: { id: string };
let checklistItemA: { id: string };
let checklistItemB: { id: string };
let taskCommentA: { id: string };
let taskCommentB: { id: string };
let taskDependencyA: { id: string };
let taskDependencyB: { id: string };
let documentAccessA: { id: string };
let documentAccessB: { id: string };
let documentVersionA: { id: string };
let documentVersionB: { id: string };
let meetingDecisionA: { id: string };
let meetingDecisionB: { id: string };
let crmContactA: { id: string };
let crmContactB: { id: string };
let meetingExternalParticipantA: { id: string };
let meetingExternalParticipantB: { id: string };
let competenceA: { id: string };
let competenceB: { id: string };
let userCompetenceA: { id: string };
let userCompetenceB: { id: string };
let knowledgeCategoryA: { id: string };
let knowledgeCategoryB: { id: string };
let knowledgeArticleA: { id: string };
let knowledgeArticleB: { id: string };
let leaveA: { id: string };
let leaveB: { id: string };
let eventA: { id: string };
let eventB: { id: string };
let objectiveA: { id: string };
let objectiveB: { id: string };
let indicatorA: { id: string };
let indicatorB: { id: string };
let evaluationA: { id: string };
let evaluationB: { id: string };
let evaluationCritereA: { id: string };
let evaluationCritereB: { id: string };
let conversationA: { id: string };
let conversationB: { id: string };
let messageA: { id: string };
let messageB: { id: string };
let reactionA: { id: string };
let reactionB: { id: string };
let notificationA: { id: string };
let notificationB: { id: string };
let crmOrganizationA: { id: string };
let crmOrganizationB: { id: string };
let portalAccountA: { id: string };
let portalAccountB: { id: string };
let portalInviteTokenA: { id: string };
let portalInviteTokenB: { id: string };
let crmOpportunityA: { id: string };
let crmOpportunityB: { id: string };
let crmInteractionA: { id: string };
let crmInteractionB: { id: string };
let contractA: { id: string };
let contractB: { id: string };
let portalMessageA: { id: string };
let portalMessageB: { id: string };
let decisionOutcomeA: { id: string };
let decisionOutcomeB: { id: string };
let posteA: { id: string };
let posteB: { id: string };
let posteResponsabiliteA: { id: string };
let posteResponsabiliteB: { id: string };
let successionPlanA: { id: string };
let successionPlanB: { id: string };
let successionCandidateA: { id: string };
let successionCandidateB: { id: string };
let siteA: { id: string };
let siteB: { id: string };
let delegationA: { id: string };
let delegationB: { id: string };
let strategicAxisA: { id: string };
let strategicAxisB: { id: string };
let swotItemA: { id: string };
let swotItemB: { id: string };
let planA: { id: string };
let planB: { id: string };
let programmeA: { id: string };
let programmeB: { id: string };
let programmeRiskA: { id: string };
let programmeRiskB: { id: string };
let governanceInstanceA: { id: string };
let governanceInstanceB: { id: string };
let governanceMeetingA: { id: string };
let governanceMeetingB: { id: string };
let governanceMeetingDocumentA: { id: string };
let governanceMeetingDocumentB: { id: string };
let governanceDecisionA: { id: string };
let governanceDecisionB: { id: string };
let processusA: { id: string };
let processusB: { id: string };
let processusEtapeA: { id: string };
let processusEtapeB: { id: string };
let processusVersionA: { id: string };
let processusVersionB: { id: string };
let processusExecutionA: { id: string };
let processusExecutionB: { id: string };
let processusExecutionEtapeA: { id: string };
let processusExecutionEtapeB: { id: string };
let processusDocumentA: { id: string };
let processusDocumentB: { id: string };
let organizationalRiskA: { id: string };
let organizationalRiskB: { id: string };
let complianceObligationA: { id: string };
let complianceObligationB: { id: string };
let complianceControlA: { id: string };
let complianceControlB: { id: string };
let complianceObligationDocumentA: { id: string };
let complianceObligationDocumentB: { id: string };
let nonConformiteA: { id: string };
let nonConformiteB: { id: string };
let nonConformiteActionA: { id: string };
let nonConformiteActionB: { id: string };
let qualityDocumentA: { id: string };
let qualityDocumentB: { id: string };
let qualityControlA: { id: string };
let qualityControlB: { id: string };
let qualityChecklistItemA: { id: string };
let qualityChecklistItemB: { id: string };
let qualityClaimA: { id: string };
let qualityClaimB: { id: string };
let auditPlanA: { id: string };
let auditPlanB: { id: string };
let auditPlanDocumentA: { id: string };
let auditPlanDocumentB: { id: string };
let auditMissionA: { id: string };
let auditMissionB: { id: string };
let auditFindingA: { id: string };
let auditFindingB: { id: string };
let incidentA: { id: string };
let incidentB: { id: string };
let changeRequestA: { id: string };
let changeRequestB: { id: string };
let validationWorkflowA: { id: string };
let validationWorkflowB: { id: string };
let validationWorkflowStepA: { id: string };
let validationWorkflowStepB: { id: string };
let taskValidationRunA: { id: string };
let taskValidationRunB: { id: string };
let taskApprovalA: { id: string };
let taskApprovalB: { id: string };
let adminRequestA: { id: string };
let adminRequestB: { id: string };
let adminRequestValidationRunA: { id: string };
let adminRequestValidationRunB: { id: string };
let adminRequestApprovalA: { id: string };
let adminRequestApprovalB: { id: string };
let courrierA: { id: string };
let courrierB: { id: string };
let automationRuleA: { id: string };
let automationRuleB: { id: string };
let automationConditionA: { id: string };
let automationConditionB: { id: string };
let orchestrationPlaybookA: { id: string };
let orchestrationPlaybookB: { id: string };
let automationExecutionA: { id: string };
let automationExecutionB: { id: string };
let pendingAiActionA: { id: string };
let pendingAiActionB: { id: string };
let orgDesignDraftA: { id: string };
let orgDesignDraftB: { id: string };
let dataClassificationA: { id: string };
let dataClassificationB: { id: string };
let transformationA: { id: string };
let transformationB: { id: string };
let organizationalMemoryEntryA: { id: string };
let organizationalMemoryEntryB: { id: string };
let decisionMatrixA: { id: string };
let decisionMatrixB: { id: string };
let decisionOptionA: { id: string };
let decisionOptionB: { id: string };
let auditLogA: { id: string };
let auditLogB: { id: string };
let integrationA: { id: string };
let integrationB: { id: string };
let integrationEventA: { id: string };
let integrationEventB: { id: string };
let dashboardWidgetPreferenceA: { id: string };
let dashboardWidgetPreferenceB: { id: string };
let aiAgentInsightA: { id: string };
let aiAgentInsightB: { id: string };
let metricSnapshotA: { id: string };
let metricSnapshotB: { id: string };
let dependencyA: { id: string };
let dependencyB: { id: string };
let scenarioA: { id: string };
let scenarioB: { id: string };
let beneficiaireA: { id: string };
let beneficiaireB: { id: string };
let entityA: { id: string };
let entityB: { id: string };
let holidayA: { id: string };
let holidayB: { id: string };
let tagA: { id: string };
let tagB: { id: string };
let entityTagA: { id: string };
let entityTagB: { id: string };
let apiKeyA: { id: string };
let apiKeyB: { id: string };
let passwordResetTokenA: { id: string };
let passwordResetTokenB: { id: string };
let permissionOverrideA: { id: string };
let permissionOverrideB: { id: string };
let teamMemberA: { id: string };
let teamMemberB: { id: string };
let stakeholderA: { id: string };
let stakeholderB: { id: string };
let stakeholderProjectA: { id: string };
let stakeholderProjectB: { id: string };
let stakeholderCommunicationA: { id: string };
let stakeholderCommunicationB: { id: string };
let userSessionA: { id: string };
let userSessionB: { id: string };
let adminUser: { id: string };
let roleId: string;

describe("RLS — isolation multi-tenant (User..ProjectResource) par organisation", () => {
  beforeAll(async () => {
    // Fixtures créées via le role admin (proprietaire, exempte de RLS) — un
    // role/utilisateur "arbitraire" existant sert de createdBy/roleId.
    adminUser = await admin.user.findFirstOrThrow({ select: { id: true } });
    const role = await admin.role.findFirstOrThrow({ select: { id: true } });
    roleId = role.id;

    orgA = await admin.platformOrganization.create({
      data: { nom: "RLS Test Org A", slug: `rls-test-a-${Date.now()}`, createdById: adminUser.id },
    });
    orgB = await admin.platformOrganization.create({
      data: { nom: "RLS Test Org B", slug: `rls-test-b-${Date.now()}`, createdById: adminUser.id },
    });

    deptA = await admin.department.create({
      data: { name: "Dept A", code: `RLSA-${Date.now()}`, organizationId: orgA.id },
    });
    deptB = await admin.department.create({
      data: { name: "Dept B", code: `RLSB-${Date.now()}`, organizationId: orgB.id },
    });

    userA = await admin.user.create({
      data: {
        name: "User Org A",
        email: `rls-user-a-${Date.now()}@example.com`,
        passwordHash: "unused",
        roleId,
        organizationId: orgA.id,
      },
    });
    userB = await admin.user.create({
      data: {
        name: "User Org B",
        email: `rls-user-b-${Date.now()}@example.com`,
        passwordHash: "unused",
        roleId,
        organizationId: orgB.id,
      },
    });

    teamA = await admin.team.create({
      data: { nom: "Team A", departmentId: deptA.id, createdById: userA.id, organizationId: orgA.id },
    });
    teamB = await admin.team.create({
      data: { nom: "Team B", departmentId: deptB.id, createdById: userB.id, organizationId: orgB.id },
    });

    projectA = await admin.project.create({
      data: {
        nom: "Project A",
        departmentId: deptA.id,
        responsableId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    projectB = await admin.project.create({
      data: {
        nom: "Project B",
        departmentId: deptB.id,
        responsableId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    taskA = await admin.task.create({
      data: {
        titre: "Task A",
        projectId: projectA.id,
        responsablePrincipalId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    taskB = await admin.task.create({
      data: {
        titre: "Task B",
        projectId: projectB.id,
        responsablePrincipalId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    sectionA = await admin.projectSection.create({
      data: { projectId: projectA.id, type: "PHASE", nom: "Section A", organizationId: orgA.id },
    });
    sectionB = await admin.projectSection.create({
      data: { projectId: projectB.id, type: "PHASE", nom: "Section B", organizationId: orgB.id },
    });

    docA = await admin.document.create({
      data: {
        projectId: projectA.id,
        nom: "Doc A",
        url: "https://example.com/doc-a",
        uploadedById: userA.id,
        organizationId: orgA.id,
      },
    });
    docB = await admin.document.create({
      data: {
        projectId: projectB.id,
        nom: "Doc B",
        url: "https://example.com/doc-b",
        uploadedById: userB.id,
        organizationId: orgB.id,
      },
    });

    meetingA = await admin.meeting.create({
      data: {
        projectId: projectA.id,
        titre: "Reunion A",
        dateHeure: new Date(),
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    meetingB = await admin.meeting.create({
      data: {
        projectId: projectB.id,
        titre: "Reunion B",
        dateHeure: new Date(),
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    folderA = await admin.documentFolder.create({
      data: {
        projectId: projectA.id,
        nom: "Dossier A",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    folderB = await admin.documentFolder.create({
      data: {
        projectId: projectB.id,
        nom: "Dossier B",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    whiteboardA = await admin.whiteboard.create({
      data: { projectId: projectA.id, content: {}, updatedById: userA.id, organizationId: orgA.id },
    });
    whiteboardB = await admin.whiteboard.create({
      data: { projectId: projectB.id, content: {}, updatedById: userB.id, organizationId: orgB.id },
    });

    projectMemberA = await admin.projectMember.create({
      data: { projectId: projectA.id, userId: userA.id, organizationId: orgA.id },
    });
    projectMemberB = await admin.projectMember.create({
      data: { projectId: projectB.id, userId: userB.id, organizationId: orgB.id },
    });

    riskA = await admin.projectRisk.create({
      data: { projectId: projectA.id, titre: "Risque A", createdById: userA.id, organizationId: orgA.id },
    });
    riskB = await admin.projectRisk.create({
      data: { projectId: projectB.id, titre: "Risque B", createdById: userB.id, organizationId: orgB.id },
    });

    milestoneA = await admin.projectMilestone.create({
      data: {
        projectId: projectA.id,
        nom: "Jalon A",
        dateCible: new Date(),
        organizationId: orgA.id,
      },
    });
    milestoneB = await admin.projectMilestone.create({
      data: {
        projectId: projectB.id,
        nom: "Jalon B",
        dateCible: new Date(),
        organizationId: orgB.id,
      },
    });

    deliverableA = await admin.projectDeliverable.create({
      data: { projectId: projectA.id, nom: "Livrable A", createdById: userA.id, organizationId: orgA.id },
    });
    deliverableB = await admin.projectDeliverable.create({
      data: { projectId: projectB.id, nom: "Livrable B", createdById: userB.id, organizationId: orgB.id },
    });

    resourceA = await admin.projectResource.create({
      data: { projectId: projectA.id, nom: "Ressource A", createdById: userA.id, organizationId: orgA.id },
    });
    resourceB = await admin.projectResource.create({
      data: { projectId: projectB.id, nom: "Ressource B", createdById: userB.id, organizationId: orgB.id },
    });

    sectionCommentA = await admin.sectionComment.create({
      data: { sectionId: sectionA.id, authorId: userA.id, content: "Commentaire A", organizationId: orgA.id },
    });
    sectionCommentB = await admin.sectionComment.create({
      data: { sectionId: sectionB.id, authorId: userB.id, content: "Commentaire B", organizationId: orgB.id },
    });

    await admin.taskAssignee.create({ data: { taskId: taskA.id, userId: userA.id, organizationId: orgA.id } });
    await admin.taskAssignee.create({ data: { taskId: taskB.id, userId: userB.id, organizationId: orgB.id } });

    checklistItemA = await admin.checklistItem.create({
      data: { taskId: taskA.id, label: "Item A", organizationId: orgA.id },
    });
    checklistItemB = await admin.checklistItem.create({
      data: { taskId: taskB.id, label: "Item B", organizationId: orgB.id },
    });

    taskCommentA = await admin.taskComment.create({
      data: { taskId: taskA.id, authorId: userA.id, content: "Commentaire A", organizationId: orgA.id },
    });
    taskCommentB = await admin.taskComment.create({
      data: { taskId: taskB.id, authorId: userB.id, content: "Commentaire B", organizationId: orgB.id },
    });

    taskA2 = await admin.task.create({
      data: {
        titre: "Task A2",
        projectId: projectA.id,
        responsablePrincipalId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    taskB2 = await admin.task.create({
      data: {
        titre: "Task B2",
        projectId: projectB.id,
        responsablePrincipalId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    taskDependencyA = await admin.taskDependency.create({
      data: { taskId: taskA2.id, dependsOnTaskId: taskA.id, organizationId: orgA.id },
    });
    taskDependencyB = await admin.taskDependency.create({
      data: { taskId: taskB2.id, dependsOnTaskId: taskB.id, organizationId: orgB.id },
    });

    documentAccessA = await admin.documentAccess.create({
      data: { documentId: docA.id, userId: userA.id, organizationId: orgA.id },
    });
    documentAccessB = await admin.documentAccess.create({
      data: { documentId: docB.id, userId: userB.id, organizationId: orgB.id },
    });

    documentVersionA = await admin.documentVersion.create({
      data: { documentId: docA.id, url: "https://example.com/v1-a", createdById: userA.id, organizationId: orgA.id },
    });
    documentVersionB = await admin.documentVersion.create({
      data: { documentId: docB.id, url: "https://example.com/v1-b", createdById: userB.id, organizationId: orgB.id },
    });

    await admin.meetingParticipant.create({
      data: { meetingId: meetingA.id, userId: userA.id, organizationId: orgA.id },
    });
    await admin.meetingParticipant.create({
      data: { meetingId: meetingB.id, userId: userB.id, organizationId: orgB.id },
    });

    meetingDecisionA = await admin.meetingDecision.create({
      data: { meetingId: meetingA.id, description: "Decision A", organizationId: orgA.id },
    });
    meetingDecisionB = await admin.meetingDecision.create({
      data: { meetingId: meetingB.id, description: "Decision B", organizationId: orgB.id },
    });

    crmContactA = await admin.crmContact.create({
      data: { prenom: "Contact", nom: "A", createdById: userA.id, platformOrganizationId: orgA.id },
    });
    crmContactB = await admin.crmContact.create({
      data: { prenom: "Contact", nom: "B", createdById: userB.id, platformOrganizationId: orgB.id },
    });

    meetingExternalParticipantA = await admin.meetingExternalParticipant.create({
      data: { meetingId: meetingA.id, contactId: crmContactA.id, organizationId: orgA.id },
    });
    meetingExternalParticipantB = await admin.meetingExternalParticipant.create({
      data: { meetingId: meetingB.id, contactId: crmContactB.id, organizationId: orgB.id },
    });

    competenceA = await admin.competence.create({
      data: { nom: `Competence A ${Date.now()}`, createdById: userA.id, organizationId: orgA.id },
    });
    competenceB = await admin.competence.create({
      data: { nom: `Competence B ${Date.now()}`, createdById: userB.id, organizationId: orgB.id },
    });

    userCompetenceA = await admin.userCompetence.create({
      data: { userId: userA.id, competenceId: competenceA.id, organizationId: orgA.id },
    });
    userCompetenceB = await admin.userCompetence.create({
      data: { userId: userB.id, competenceId: competenceB.id, organizationId: orgB.id },
    });

    knowledgeCategoryA = await admin.knowledgeCategory.create({
      data: { nom: "Categorie A", createdById: userA.id, organizationId: orgA.id },
    });
    knowledgeCategoryB = await admin.knowledgeCategory.create({
      data: { nom: "Categorie B", createdById: userB.id, organizationId: orgB.id },
    });

    knowledgeArticleA = await admin.knowledgeArticle.create({
      data: { titre: "Article A", content: "Contenu A", authorId: userA.id, organizationId: orgA.id },
    });
    knowledgeArticleB = await admin.knowledgeArticle.create({
      data: { titre: "Article B", content: "Contenu B", authorId: userB.id, organizationId: orgB.id },
    });

    leaveA = await admin.leave.create({
      data: {
        userId: userA.id,
        dateDebut: new Date(),
        dateFin: new Date(),
        organizationId: orgA.id,
      },
    });
    leaveB = await admin.leave.create({
      data: {
        userId: userB.id,
        dateDebut: new Date(),
        dateFin: new Date(),
        organizationId: orgB.id,
      },
    });

    eventA = await admin.event.create({
      data: { titre: "Event A", dateDebut: new Date(), createdById: userA.id, organizationId: orgA.id },
    });
    eventB = await admin.event.create({
      data: { titre: "Event B", dateDebut: new Date(), createdById: userB.id, organizationId: orgB.id },
    });

    objectiveA = await admin.objective.create({
      data: {
        titre: "Objectif A",
        periode: "ANNUEL",
        scope: "INDIVIDUEL",
        dateDebut: new Date(),
        dateFin: new Date(),
        userId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    objectiveB = await admin.objective.create({
      data: {
        titre: "Objectif B",
        periode: "ANNUEL",
        scope: "INDIVIDUEL",
        dateDebut: new Date(),
        dateFin: new Date(),
        userId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    indicatorA = await admin.indicator.create({
      data: { objectiveId: objectiveA.id, nom: "Indicateur A", valeurCible: 100, organizationId: orgA.id },
    });
    indicatorB = await admin.indicator.create({
      data: { objectiveId: objectiveB.id, nom: "Indicateur B", valeurCible: 100, organizationId: orgB.id },
    });

    evaluationA = await admin.evaluation.create({
      data: {
        periode: "ANNUELLE",
        dateDebut: new Date(),
        dateFin: new Date(),
        evalueId: userA.id,
        evaluateurId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    evaluationB = await admin.evaluation.create({
      data: {
        periode: "ANNUELLE",
        dateDebut: new Date(),
        dateFin: new Date(),
        evalueId: userB.id,
        evaluateurId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    evaluationCritereA = await admin.evaluationCritere.create({
      data: { evaluationId: evaluationA.id, libelle: "Critere A", note: 5, organizationId: orgA.id },
    });
    evaluationCritereB = await admin.evaluationCritere.create({
      data: { evaluationId: evaluationB.id, libelle: "Critere B", note: 5, organizationId: orgB.id },
    });

    conversationA = await admin.conversation.create({
      data: { createdById: userA.id, organizationId: orgA.id },
    });
    conversationB = await admin.conversation.create({
      data: { createdById: userB.id, organizationId: orgB.id },
    });

    await admin.conversationParticipant.create({
      data: { conversationId: conversationA.id, userId: userA.id, organizationId: orgA.id },
    });
    await admin.conversationParticipant.create({
      data: { conversationId: conversationB.id, userId: userB.id, organizationId: orgB.id },
    });

    messageA = await admin.message.create({
      data: { conversationId: conversationA.id, authorId: userA.id, content: "Message A", organizationId: orgA.id },
    });
    messageB = await admin.message.create({
      data: { conversationId: conversationB.id, authorId: userB.id, content: "Message B", organizationId: orgB.id },
    });

    reactionA = await admin.reaction.create({
      data: { emoji: "👍", userId: userA.id, messageId: messageA.id, organizationId: orgA.id },
    });
    reactionB = await admin.reaction.create({
      data: { emoji: "👍", userId: userB.id, messageId: messageB.id, organizationId: orgB.id },
    });

    notificationA = await admin.notification.create({
      data: { userId: userA.id, type: "COMMENTAIRE", titre: "Notif A", organizationId: orgA.id },
    });
    notificationB = await admin.notification.create({
      data: { userId: userB.id, type: "COMMENTAIRE", titre: "Notif B", organizationId: orgB.id },
    });

    crmOrganizationA = await admin.crmOrganization.create({
      data: { nom: "CRM Org A", createdById: userA.id, platformOrganizationId: orgA.id },
    });
    crmOrganizationB = await admin.crmOrganization.create({
      data: { nom: "CRM Org B", createdById: userB.id, platformOrganizationId: orgB.id },
    });

    portalAccountA = await admin.portalAccount.create({
      data: {
        contactId: crmContactA.id,
        email: `portal-a-${Date.now()}@example.com`,
        invitedById: userA.id,
        platformOrganizationId: orgA.id,
      },
    });
    portalAccountB = await admin.portalAccount.create({
      data: {
        contactId: crmContactB.id,
        email: `portal-b-${Date.now()}@example.com`,
        invitedById: userB.id,
        platformOrganizationId: orgB.id,
      },
    });

    portalInviteTokenA = await admin.portalInviteToken.create({
      data: {
        portalAccountId: portalAccountA.id,
        tokenHash: `hash-a-${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400000),
        platformOrganizationId: orgA.id,
      },
    });
    portalInviteTokenB = await admin.portalInviteToken.create({
      data: {
        portalAccountId: portalAccountB.id,
        tokenHash: `hash-b-${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400000),
        platformOrganizationId: orgB.id,
      },
    });

    crmOpportunityA = await admin.crmOpportunity.create({
      data: {
        nom: "Opportunite A",
        ownerId: userA.id,
        createdById: userA.id,
        platformOrganizationId: orgA.id,
      },
    });
    crmOpportunityB = await admin.crmOpportunity.create({
      data: {
        nom: "Opportunite B",
        ownerId: userB.id,
        createdById: userB.id,
        platformOrganizationId: orgB.id,
      },
    });

    crmInteractionA = await admin.crmInteraction.create({
      data: { type: "NOTE", contenu: "Interaction A", authorId: userA.id, platformOrganizationId: orgA.id },
    });
    crmInteractionB = await admin.crmInteraction.create({
      data: { type: "NOTE", contenu: "Interaction B", authorId: userB.id, platformOrganizationId: orgB.id },
    });

    contractA = await admin.contract.create({
      data: { nom: "Contrat A", createdById: userA.id, platformOrganizationId: orgA.id },
    });
    contractB = await admin.contract.create({
      data: { nom: "Contrat B", createdById: userB.id, platformOrganizationId: orgB.id },
    });

    portalMessageA = await admin.portalMessage.create({
      data: {
        contactId: crmContactA.id,
        authorType: "INTERNAL",
        authorUserId: userA.id,
        content: "Message portail A",
        platformOrganizationId: orgA.id,
      },
    });
    portalMessageB = await admin.portalMessage.create({
      data: {
        contactId: crmContactB.id,
        authorType: "INTERNAL",
        authorUserId: userB.id,
        content: "Message portail B",
        platformOrganizationId: orgB.id,
      },
    });

    decisionOutcomeA = await admin.decisionOutcome.create({
      data: { titre: "Decision A", dateDecision: new Date(), createdById: userA.id, organizationId: orgA.id },
    });
    decisionOutcomeB = await admin.decisionOutcome.create({
      data: { titre: "Decision B", dateDecision: new Date(), createdById: userB.id, organizationId: orgB.id },
    });

    posteA = await admin.poste.create({
      data: { nom: "Poste A", departmentId: deptA.id, organizationId: orgA.id },
    });
    posteB = await admin.poste.create({
      data: { nom: "Poste B", departmentId: deptB.id, organizationId: orgB.id },
    });

    posteResponsabiliteA = await admin.posteResponsabilite.create({
      data: { posteId: posteA.id, libelle: "Responsabilite A", organizationId: orgA.id },
    });
    posteResponsabiliteB = await admin.posteResponsabilite.create({
      data: { posteId: posteB.id, libelle: "Responsabilite B", organizationId: orgB.id },
    });

    successionPlanA = await admin.successionPlan.create({
      data: { posteId: posteA.id, createdById: userA.id, organizationId: orgA.id },
    });
    successionPlanB = await admin.successionPlan.create({
      data: { posteId: posteB.id, createdById: userB.id, organizationId: orgB.id },
    });

    successionCandidateA = await admin.successionCandidate.create({
      data: { successionPlanId: successionPlanA.id, userId: userA.id, organizationId: orgA.id },
    });
    successionCandidateB = await admin.successionCandidate.create({
      data: { successionPlanId: successionPlanB.id, userId: userB.id, organizationId: orgB.id },
    });

    siteA = await admin.site.create({ data: { nom: "Site A", departmentId: deptA.id, organizationId: orgA.id } });
    siteB = await admin.site.create({ data: { nom: "Site B", departmentId: deptB.id, organizationId: orgB.id } });

    delegationA = await admin.delegation.create({
      data: {
        delegantId: userA.id,
        delegataireId: userA.id,
        dateDebut: new Date(),
        dateFin: new Date(),
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    delegationB = await admin.delegation.create({
      data: {
        delegantId: userB.id,
        delegataireId: userB.id,
        dateDebut: new Date(),
        dateFin: new Date(),
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    strategicAxisA = await admin.strategicAxis.create({
      data: { nom: "Axe A", createdById: userA.id, organizationId: orgA.id },
    });
    strategicAxisB = await admin.strategicAxis.create({
      data: { nom: "Axe B", createdById: userB.id, organizationId: orgB.id },
    });

    swotItemA = await admin.swotItem.create({
      data: { categorie: "FORCE", contenu: "Force A", createdById: userA.id, organizationId: orgA.id },
    });
    swotItemB = await admin.swotItem.create({
      data: { categorie: "FORCE", contenu: "Force B", createdById: userB.id, organizationId: orgB.id },
    });

    planA = await admin.plan.create({
      data: {
        nom: "Plan A",
        niveau: "STRATEGIQUE",
        dateDebut: new Date(),
        dateFin: new Date(),
        ownerId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    planB = await admin.plan.create({
      data: {
        nom: "Plan B",
        niveau: "STRATEGIQUE",
        dateDebut: new Date(),
        dateFin: new Date(),
        ownerId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    programmeA = await admin.programme.create({
      data: { nom: "Programme A", responsableId: userA.id, createdById: userA.id, organizationId: orgA.id },
    });
    programmeB = await admin.programme.create({
      data: { nom: "Programme B", responsableId: userB.id, createdById: userB.id, organizationId: orgB.id },
    });

    programmeRiskA = await admin.programmeRisk.create({
      data: { programmeId: programmeA.id, titre: "Risque A", createdById: userA.id, organizationId: orgA.id },
    });
    programmeRiskB = await admin.programmeRisk.create({
      data: { programmeId: programmeB.id, titre: "Risque B", createdById: userB.id, organizationId: orgB.id },
    });

    governanceInstanceA = await admin.governanceInstance.create({
      data: { nom: "Instance A", createdById: userA.id, organizationId: orgA.id },
    });
    governanceInstanceB = await admin.governanceInstance.create({
      data: { nom: "Instance B", createdById: userB.id, organizationId: orgB.id },
    });

    governanceMeetingA = await admin.governanceMeeting.create({
      data: {
        instanceId: governanceInstanceA.id,
        titre: "Reunion Gouvernance A",
        dateHeure: new Date(),
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    governanceMeetingB = await admin.governanceMeeting.create({
      data: {
        instanceId: governanceInstanceB.id,
        titre: "Reunion Gouvernance B",
        dateHeure: new Date(),
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    await admin.governanceMeetingParticipant.create({
      data: { meetingId: governanceMeetingA.id, userId: userA.id, organizationId: orgA.id },
    });
    await admin.governanceMeetingParticipant.create({
      data: { meetingId: governanceMeetingB.id, userId: userB.id, organizationId: orgB.id },
    });

    governanceMeetingDocumentA = await admin.governanceMeetingDocument.create({
      data: {
        meetingId: governanceMeetingA.id,
        nom: "Doc Gouvernance A",
        url: "https://example.com/gov-doc-a",
        uploadedById: userA.id,
        organizationId: orgA.id,
      },
    });
    governanceMeetingDocumentB = await admin.governanceMeetingDocument.create({
      data: {
        meetingId: governanceMeetingB.id,
        nom: "Doc Gouvernance B",
        url: "https://example.com/gov-doc-b",
        uploadedById: userB.id,
        organizationId: orgB.id,
      },
    });

    governanceDecisionA = await admin.governanceDecision.create({
      data: {
        meetingId: governanceMeetingA.id,
        objet: "Objet A",
        decision: "Decision A",
        organizationId: orgA.id,
      },
    });
    governanceDecisionB = await admin.governanceDecision.create({
      data: {
        meetingId: governanceMeetingB.id,
        objet: "Objet B",
        decision: "Decision B",
        organizationId: orgB.id,
      },
    });

    processusA = await admin.processus.create({
      data: { nom: "Processus A", createdById: userA.id, organizationId: orgA.id },
    });
    processusB = await admin.processus.create({
      data: { nom: "Processus B", createdById: userB.id, organizationId: orgB.id },
    });

    processusEtapeA = await admin.processusEtape.create({
      data: { processusId: processusA.id, nom: "Etape A", organizationId: orgA.id },
    });
    processusEtapeB = await admin.processusEtape.create({
      data: { processusId: processusB.id, nom: "Etape B", organizationId: orgB.id },
    });

    processusVersionA = await admin.processusVersion.create({
      data: { processusId: processusA.id, version: 1, createdById: userA.id, organizationId: orgA.id },
    });
    processusVersionB = await admin.processusVersion.create({
      data: { processusId: processusB.id, version: 1, createdById: userB.id, organizationId: orgB.id },
    });

    processusExecutionA = await admin.processusExecution.create({
      data: {
        processusId: processusA.id,
        libelle: "Execution A",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    processusExecutionB = await admin.processusExecution.create({
      data: {
        processusId: processusB.id,
        libelle: "Execution B",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    processusExecutionEtapeA = await admin.processusExecutionEtape.create({
      data: { executionId: processusExecutionA.id, etapeId: processusEtapeA.id, organizationId: orgA.id },
    });
    processusExecutionEtapeB = await admin.processusExecutionEtape.create({
      data: { executionId: processusExecutionB.id, etapeId: processusEtapeB.id, organizationId: orgB.id },
    });

    processusDocumentA = await admin.processusDocument.create({
      data: {
        processusId: processusA.id,
        nom: "Doc Processus A",
        url: "https://example.com/proc-doc-a",
        uploadedById: userA.id,
        organizationId: orgA.id,
      },
    });
    processusDocumentB = await admin.processusDocument.create({
      data: {
        processusId: processusB.id,
        nom: "Doc Processus B",
        url: "https://example.com/proc-doc-b",
        uploadedById: userB.id,
        organizationId: orgB.id,
      },
    });

    organizationalRiskA = await admin.organizationalRisk.create({
      data: {
        code: `RISK-A-${Date.now()}`,
        titre: "Risque organisationnel A",
        criticite: "MODERE",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    organizationalRiskB = await admin.organizationalRisk.create({
      data: {
        code: `RISK-B-${Date.now()}`,
        titre: "Risque organisationnel B",
        criticite: "MODERE",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    complianceObligationA = await admin.complianceObligation.create({
      data: { titre: "Obligation A", createdById: userA.id, organizationId: orgA.id },
    });
    complianceObligationB = await admin.complianceObligation.create({
      data: { titre: "Obligation B", createdById: userB.id, organizationId: orgB.id },
    });

    complianceControlA = await admin.complianceControl.create({
      data: {
        obligationId: complianceObligationA.id,
        resultat: "CONFORME",
        controleParId: userA.id,
        organizationId: orgA.id,
      },
    });
    complianceControlB = await admin.complianceControl.create({
      data: {
        obligationId: complianceObligationB.id,
        resultat: "CONFORME",
        controleParId: userB.id,
        organizationId: orgB.id,
      },
    });

    complianceObligationDocumentA = await admin.complianceObligationDocument.create({
      data: {
        obligationId: complianceObligationA.id,
        nom: "Doc Obligation A",
        url: "https://example.com/oblig-doc-a",
        uploadedById: userA.id,
        organizationId: orgA.id,
      },
    });
    complianceObligationDocumentB = await admin.complianceObligationDocument.create({
      data: {
        obligationId: complianceObligationB.id,
        nom: "Doc Obligation B",
        url: "https://example.com/oblig-doc-b",
        uploadedById: userB.id,
        organizationId: orgB.id,
      },
    });

    nonConformiteA = await admin.nonConformite.create({
      data: { source: "QUALITE", titre: "NC A", detecteeParId: userA.id, organizationId: orgA.id },
    });
    nonConformiteB = await admin.nonConformite.create({
      data: { source: "QUALITE", titre: "NC B", detecteeParId: userB.id, organizationId: orgB.id },
    });

    nonConformiteActionA = await admin.nonConformiteAction.create({
      data: { nonConformiteId: nonConformiteA.id, description: "Action A", organizationId: orgA.id },
    });
    nonConformiteActionB = await admin.nonConformiteAction.create({
      data: { nonConformiteId: nonConformiteB.id, description: "Action B", organizationId: orgB.id },
    });

    qualityDocumentA = await admin.qualityDocument.create({
      data: { type: "PROCEDURE", titre: "Doc Qualite A", createdById: userA.id, organizationId: orgA.id },
    });
    qualityDocumentB = await admin.qualityDocument.create({
      data: { type: "PROCEDURE", titre: "Doc Qualite B", createdById: userB.id, organizationId: orgB.id },
    });

    qualityControlA = await admin.qualityControl.create({
      data: { titre: "Controle A", resultat: "CONFORME", controleParId: userA.id, organizationId: orgA.id },
    });
    qualityControlB = await admin.qualityControl.create({
      data: { titre: "Controle B", resultat: "CONFORME", controleParId: userB.id, organizationId: orgB.id },
    });

    qualityChecklistItemA = await admin.qualityChecklistItem.create({
      data: { controlId: qualityControlA.id, label: "Item A", organizationId: orgA.id },
    });
    qualityChecklistItemB = await admin.qualityChecklistItem.create({
      data: { controlId: qualityControlB.id, label: "Item B", organizationId: orgB.id },
    });

    qualityClaimA = await admin.qualityClaim.create({
      data: { titre: "Reclamation A", description: "Desc A", createdById: userA.id, organizationId: orgA.id },
    });
    qualityClaimB = await admin.qualityClaim.create({
      data: { titre: "Reclamation B", description: "Desc B", createdById: userB.id, organizationId: orgB.id },
    });

    auditPlanA = await admin.auditPlan.create({
      data: {
        titre: "Plan Audit A",
        dateDebut: new Date(),
        dateFin: new Date(),
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    auditPlanB = await admin.auditPlan.create({
      data: {
        titre: "Plan Audit B",
        dateDebut: new Date(),
        dateFin: new Date(),
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    await admin.auditPlanMember.create({
      data: { planId: auditPlanA.id, userId: userA.id, organizationId: orgA.id },
    });
    await admin.auditPlanMember.create({
      data: { planId: auditPlanB.id, userId: userB.id, organizationId: orgB.id },
    });

    auditPlanDocumentA = await admin.auditPlanDocument.create({
      data: {
        planId: auditPlanA.id,
        nom: "Doc Plan Audit A",
        url: "https://example.com/audit-doc-a",
        uploadedById: userA.id,
        organizationId: orgA.id,
      },
    });
    auditPlanDocumentB = await admin.auditPlanDocument.create({
      data: {
        planId: auditPlanB.id,
        nom: "Doc Plan Audit B",
        url: "https://example.com/audit-doc-b",
        uploadedById: userB.id,
        organizationId: orgB.id,
      },
    });

    auditMissionA = await admin.auditMission.create({
      data: { planId: auditPlanA.id, titre: "Mission A", createdById: userA.id, organizationId: orgA.id },
    });
    auditMissionB = await admin.auditMission.create({
      data: { planId: auditPlanB.id, titre: "Mission B", createdById: userB.id, organizationId: orgB.id },
    });

    auditFindingA = await admin.auditFinding.create({
      data: { missionId: auditMissionA.id, constat: "Constat A", organizationId: orgA.id },
    });
    auditFindingB = await admin.auditFinding.create({
      data: { missionId: auditMissionB.id, constat: "Constat B", organizationId: orgB.id },
    });

    incidentA = await admin.incident.create({
      data: { type: "ORGANISATIONNEL", titre: "Incident A", declareParId: userA.id, organizationId: orgA.id },
    });
    incidentB = await admin.incident.create({
      data: { type: "ORGANISATIONNEL", titre: "Incident B", declareParId: userB.id, organizationId: orgB.id },
    });

    changeRequestA = await admin.changeRequest.create({
      data: { titre: "Changement A", demandeParId: userA.id, organizationId: orgA.id },
    });
    changeRequestB = await admin.changeRequest.create({
      data: { titre: "Changement B", demandeParId: userB.id, organizationId: orgB.id },
    });

    validationWorkflowA = await admin.validationWorkflow.create({
      data: {
        nom: "Circuit A",
        entityType: "TASK",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    validationWorkflowB = await admin.validationWorkflow.create({
      data: {
        nom: "Circuit B",
        entityType: "TASK",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    validationWorkflowStepA = await admin.validationWorkflowStep.create({
      data: { workflowId: validationWorkflowA.id, ordre: 1, approverRole: "MANAGER", organizationId: orgA.id },
    });
    validationWorkflowStepB = await admin.validationWorkflowStep.create({
      data: { workflowId: validationWorkflowB.id, ordre: 1, approverRole: "MANAGER", organizationId: orgB.id },
    });

    taskValidationRunA = await admin.taskValidationRun.create({
      data: {
        taskId: taskA2.id,
        workflowId: validationWorkflowA.id,
        submittedById: userA.id,
        organizationId: orgA.id,
      },
    });
    taskValidationRunB = await admin.taskValidationRun.create({
      data: {
        taskId: taskB2.id,
        workflowId: validationWorkflowB.id,
        submittedById: userB.id,
        organizationId: orgB.id,
      },
    });

    taskApprovalA = await admin.taskApproval.create({
      data: { runId: taskValidationRunA.id, stepId: validationWorkflowStepA.id, organizationId: orgA.id },
    });
    taskApprovalB = await admin.taskApproval.create({
      data: { runId: taskValidationRunB.id, stepId: validationWorkflowStepB.id, organizationId: orgB.id },
    });

    adminRequestA = await admin.adminRequest.create({
      data: { type: "ACHAT", titre: "Demande A", demandeurId: userA.id, organizationId: orgA.id },
    });
    adminRequestB = await admin.adminRequest.create({
      data: { type: "ACHAT", titre: "Demande B", demandeurId: userB.id, organizationId: orgB.id },
    });

    adminRequestValidationRunA = await admin.adminRequestValidationRun.create({
      data: {
        adminRequestId: adminRequestA.id,
        workflowId: validationWorkflowA.id,
        submittedById: userA.id,
        organizationId: orgA.id,
      },
    });
    adminRequestValidationRunB = await admin.adminRequestValidationRun.create({
      data: {
        adminRequestId: adminRequestB.id,
        workflowId: validationWorkflowB.id,
        submittedById: userB.id,
        organizationId: orgB.id,
      },
    });

    adminRequestApprovalA = await admin.adminRequestApproval.create({
      data: {
        runId: adminRequestValidationRunA.id,
        stepId: validationWorkflowStepA.id,
        organizationId: orgA.id,
      },
    });
    adminRequestApprovalB = await admin.adminRequestApproval.create({
      data: {
        runId: adminRequestValidationRunB.id,
        stepId: validationWorkflowStepB.id,
        organizationId: orgB.id,
      },
    });

    courrierA = await admin.courrier.create({
      data: {
        reference: `CRR-TEST-A-${Date.now()}`,
        objet: "Objet A",
        type: "ENTRANT",
        dateCourrier: new Date(),
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    courrierB = await admin.courrier.create({
      data: {
        reference: `CRR-TEST-B-${Date.now()}`,
        objet: "Objet B",
        type: "ENTRANT",
        dateCourrier: new Date(),
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    automationRuleA = await admin.automationRule.create({
      data: {
        nom: "Regle A",
        trigger: "TASK_COMPLETED",
        action: "SEND_REMINDER",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    automationRuleB = await admin.automationRule.create({
      data: {
        nom: "Regle B",
        trigger: "TASK_COMPLETED",
        action: "SEND_REMINDER",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    automationConditionA = await admin.automationCondition.create({
      data: {
        ruleId: automationRuleA.id,
        champ: "task.retardJours",
        operateur: "GREATER_THAN",
        valeur: "3",
        organizationId: orgA.id,
      },
    });
    automationConditionB = await admin.automationCondition.create({
      data: {
        ruleId: automationRuleB.id,
        champ: "task.retardJours",
        operateur: "GREATER_THAN",
        valeur: "3",
        organizationId: orgB.id,
      },
    });

    orchestrationPlaybookA = await admin.orchestrationPlaybook.create({
      data: { nom: "Playbook A", trigger: "TASK_COMPLETED", createdById: userA.id, organizationId: orgA.id },
    });
    orchestrationPlaybookB = await admin.orchestrationPlaybook.create({
      data: { nom: "Playbook B", trigger: "TASK_COMPLETED", createdById: userB.id, organizationId: orgB.id },
    });

    automationExecutionA = await admin.automationExecution.create({
      data: {
        ruleId: automationRuleA.id,
        entityType: "Task",
        entityId: taskA.id,
        resultat: "OK",
        organizationId: orgA.id,
      },
    });
    automationExecutionB = await admin.automationExecution.create({
      data: {
        ruleId: automationRuleB.id,
        entityType: "Task",
        entityId: taskB.id,
        resultat: "OK",
        organizationId: orgB.id,
      },
    });

    pendingAiActionA = await admin.pendingAiAction.create({
      data: {
        ruleId: automationRuleA.id,
        entityType: "Task",
        entityId: taskA.id,
        label: "Action A",
        organizationId: orgA.id,
      },
    });
    pendingAiActionB = await admin.pendingAiAction.create({
      data: {
        ruleId: automationRuleB.id,
        entityType: "Task",
        entityId: taskB.id,
        label: "Action B",
        organizationId: orgB.id,
      },
    });

    orgDesignDraftA = await admin.orgDesignDraft.create({
      data: { nom: "Draft A", structure: {}, createdById: userA.id, organizationId: orgA.id },
    });
    orgDesignDraftB = await admin.orgDesignDraft.create({
      data: { nom: "Draft B", structure: {}, createdById: userB.id, organizationId: orgB.id },
    });

    dataClassificationA = await admin.dataClassification.create({
      data: {
        entityType: "Document",
        entityId: docA.id,
        classifiedById: userA.id,
        organizationId: orgA.id,
      },
    });
    dataClassificationB = await admin.dataClassification.create({
      data: {
        entityType: "Document",
        entityId: docB.id,
        classifiedById: userB.id,
        organizationId: orgB.id,
      },
    });

    transformationA = await admin.transformation.create({
      data: {
        nom: "Transformation A",
        type: "DIGITALE",
        responsableId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    transformationB = await admin.transformation.create({
      data: {
        nom: "Transformation B",
        type: "DIGITALE",
        responsableId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    organizationalMemoryEntryA = await admin.organizationalMemoryEntry.create({
      data: {
        type: "EXPERIENCE",
        titre: "Memoire A",
        contenu: "Contenu A",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    organizationalMemoryEntryB = await admin.organizationalMemoryEntry.create({
      data: {
        type: "EXPERIENCE",
        titre: "Memoire B",
        contenu: "Contenu B",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    decisionMatrixA = await admin.decisionMatrix.create({
      data: { titre: "Matrice A", createdById: userA.id, organizationId: orgA.id },
    });
    decisionMatrixB = await admin.decisionMatrix.create({
      data: { titre: "Matrice B", createdById: userB.id, organizationId: orgB.id },
    });

    decisionOptionA = await admin.decisionOption.create({
      data: { matrixId: decisionMatrixA.id, nom: "Option A", organizationId: orgA.id },
    });
    decisionOptionB = await admin.decisionOption.create({
      data: { matrixId: decisionMatrixB.id, nom: "Option B", organizationId: orgB.id },
    });

    auditLogA = await admin.auditLog.create({
      data: { userId: userA.id, action: "CREATE", entityType: "Task", entityId: taskA.id, organizationId: orgA.id },
    });
    auditLogB = await admin.auditLog.create({
      data: { userId: userB.id, action: "CREATE", entityType: "Task", entityId: taskB.id, organizationId: orgB.id },
    });

    integrationA = await admin.integration.create({
      data: { nom: "Integration A", type: "EMAIL", createdById: userA.id, organizationId: orgA.id },
    });
    integrationB = await admin.integration.create({
      data: { nom: "Integration B", type: "EMAIL", createdById: userB.id, organizationId: orgB.id },
    });

    integrationEventA = await admin.integrationEvent.create({
      data: { integrationId: integrationA.id, eventType: "test", payload: {}, organizationId: orgA.id },
    });
    integrationEventB = await admin.integrationEvent.create({
      data: { integrationId: integrationB.id, eventType: "test", payload: {}, organizationId: orgB.id },
    });

    dashboardWidgetPreferenceA = await admin.dashboardWidgetPreference.create({
      data: { userId: userA.id, widgets: [], organizationId: orgA.id },
    });
    dashboardWidgetPreferenceB = await admin.dashboardWidgetPreference.create({
      data: { userId: userB.id, widgets: [], organizationId: orgB.id },
    });

    aiAgentInsightA = await admin.aiAgentInsight.create({
      data: {
        agent: "ANALYST",
        type: "RECOMMANDATION",
        titre: "Insight A",
        contenu: "Contenu A",
        organizationId: orgA.id,
      },
    });
    aiAgentInsightB = await admin.aiAgentInsight.create({
      data: {
        agent: "ANALYST",
        type: "RECOMMANDATION",
        titre: "Insight B",
        contenu: "Contenu B",
        organizationId: orgB.id,
      },
    });

    metricSnapshotA = await admin.metricSnapshot.create({
      data: { entityType: "Project", entityId: projectA.id, metric: "avancement", valeur: 50, organizationId: orgA.id },
    });
    metricSnapshotB = await admin.metricSnapshot.create({
      data: { entityType: "Project", entityId: projectB.id, metric: "avancement", valeur: 50, organizationId: orgB.id },
    });

    dependencyA = await admin.dependency.create({
      data: {
        sourceType: "Project",
        sourceId: projectA.id,
        targetType: "Project",
        targetId: projectA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    dependencyB = await admin.dependency.create({
      data: {
        sourceType: "Project",
        sourceId: projectB.id,
        targetType: "Project",
        targetId: projectB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    scenarioA = await admin.scenario.create({
      data: { nom: "Scenario A", type: "EFFECTIF", createdById: userA.id, organizationId: orgA.id },
    });
    scenarioB = await admin.scenario.create({
      data: { nom: "Scenario B", type: "EFFECTIF", createdById: userB.id, organizationId: orgB.id },
    });

    beneficiaireA = await admin.beneficiaire.create({
      data: { nom: "Beneficiaire A", createdById: userA.id, organizationId: orgA.id },
    });
    beneficiaireB = await admin.beneficiaire.create({
      data: { nom: "Beneficiaire B", createdById: userB.id, organizationId: orgB.id },
    });

    entityA = await admin.entity.create({
      data: { nom: "Entite A", code: `ENT-A-${Date.now()}`, organizationId: orgA.id },
    });
    entityB = await admin.entity.create({
      data: { nom: "Entite B", code: `ENT-B-${Date.now()}`, organizationId: orgB.id },
    });

    holidayA = await admin.holiday.create({
      data: { entityId: entityA.id, nom: "Ferie A", date: new Date(), createdById: userA.id, organizationId: orgA.id },
    });
    holidayB = await admin.holiday.create({
      data: { entityId: entityB.id, nom: "Ferie B", date: new Date(), createdById: userB.id, organizationId: orgB.id },
    });

    tagA = await admin.tag.create({
      data: { nom: `Tag A ${Date.now()}`, createdById: userA.id, organizationId: orgA.id },
    });
    tagB = await admin.tag.create({
      data: { nom: `Tag B ${Date.now()}`, createdById: userB.id, organizationId: orgB.id },
    });

    entityTagA = await admin.entityTag.create({
      data: { tagId: tagA.id, entityType: "Project", entityId: projectA.id, organizationId: orgA.id },
    });
    entityTagB = await admin.entityTag.create({
      data: { tagId: tagB.id, entityType: "Project", entityId: projectB.id, organizationId: orgB.id },
    });

    apiKeyA = await admin.apiKey.create({
      data: {
        nom: "Cle A",
        keyPrefix: "afriflow_a",
        keyHash: "hash-a",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    apiKeyB = await admin.apiKey.create({
      data: {
        nom: "Cle B",
        keyPrefix: "afriflow_b",
        keyHash: "hash-b",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    passwordResetTokenA = await admin.passwordResetToken.create({
      data: {
        userId: userA.id,
        tokenHash: `hash-reset-a-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000),
        organizationId: orgA.id,
      },
    });
    passwordResetTokenB = await admin.passwordResetToken.create({
      data: {
        userId: userB.id,
        tokenHash: `hash-reset-b-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000),
        organizationId: orgB.id,
      },
    });

    permissionOverrideA = await admin.permissionOverride.create({
      data: {
        userId: userA.id,
        permissionKey: "document.view",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    permissionOverrideB = await admin.permissionOverride.create({
      data: {
        userId: userB.id,
        permissionKey: "document.view",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    teamMemberA = await admin.teamMember.create({
      data: { teamId: teamA.id, userId: userA.id, organizationId: orgA.id },
    });
    teamMemberB = await admin.teamMember.create({
      data: { teamId: teamB.id, userId: userB.id, organizationId: orgB.id },
    });

    stakeholderA = await admin.stakeholder.create({
      data: { nom: "Partie prenante A", createdById: userA.id, organizationId: orgA.id },
    });
    stakeholderB = await admin.stakeholder.create({
      data: { nom: "Partie prenante B", createdById: userB.id, organizationId: orgB.id },
    });

    stakeholderProjectA = await admin.stakeholderProject.create({
      data: { stakeholderId: stakeholderA.id, projectId: projectA.id, organizationId: orgA.id },
    });
    stakeholderProjectB = await admin.stakeholderProject.create({
      data: { stakeholderId: stakeholderB.id, projectId: projectB.id, organizationId: orgB.id },
    });

    stakeholderCommunicationA = await admin.stakeholderCommunication.create({
      data: {
        stakeholderId: stakeholderA.id,
        resume: "Echange A",
        authorId: userA.id,
        organizationId: orgA.id,
      },
    });
    stakeholderCommunicationB = await admin.stakeholderCommunication.create({
      data: {
        stakeholderId: stakeholderB.id,
        resume: "Echange B",
        authorId: userB.id,
        organizationId: orgB.id,
      },
    });

    userSessionA = await admin.userSession.create({
      data: { userId: userA.id, organizationId: orgA.id },
    });
    userSessionB = await admin.userSession.create({
      data: { userId: userB.id, organizationId: orgB.id },
    });
  });

  afterAll(async () => {
    // Nettoyage via le role admin (le role restreint ne peut de toute facon
    // pas voir/supprimer les lignes hors de son organisation). Ordre inverse
    // des FK : les modeles "feuilles" (lots 7-17) d'abord, puis Meeting/
    // DocumentFolder/Document/Task/ProjectSection/Whiteboard/ProjectMember/
    // ProjectRisk/ProjectMilestone/ProjectDeliverable/ProjectResource
    // referencent Project+User, Project/Team referencent User+Department,
    // qui referencent PlatformOrganization. AdminRequestApproval/
    // AdminRequestValidationRun/AdminRequest/TaskApproval/TaskValidationRun/
    // ValidationWorkflowStep/ValidationWorkflow/Courrier avant taskA2/taskB2
    // (TaskValidationRun.taskId les referme).
    await admin.userSession.deleteMany({ where: { id: { in: [userSessionA.id, userSessionB.id] } } });
    await admin.stakeholderCommunication.deleteMany({
      where: { id: { in: [stakeholderCommunicationA.id, stakeholderCommunicationB.id] } },
    });
    await admin.stakeholderProject.deleteMany({
      where: { id: { in: [stakeholderProjectA.id, stakeholderProjectB.id] } },
    });
    await admin.stakeholder.deleteMany({ where: { id: { in: [stakeholderA.id, stakeholderB.id] } } });
    await admin.teamMember.deleteMany({ where: { id: { in: [teamMemberA.id, teamMemberB.id] } } });
    await admin.permissionOverride.deleteMany({
      where: { id: { in: [permissionOverrideA.id, permissionOverrideB.id] } },
    });
    await admin.passwordResetToken.deleteMany({
      where: { id: { in: [passwordResetTokenA.id, passwordResetTokenB.id] } },
    });
    await admin.apiKey.deleteMany({ where: { id: { in: [apiKeyA.id, apiKeyB.id] } } });
    await admin.entityTag.deleteMany({ where: { id: { in: [entityTagA.id, entityTagB.id] } } });
    await admin.tag.deleteMany({ where: { id: { in: [tagA.id, tagB.id] } } });
    await admin.holiday.deleteMany({ where: { id: { in: [holidayA.id, holidayB.id] } } });
    await admin.entity.deleteMany({ where: { id: { in: [entityA.id, entityB.id] } } });
    await admin.beneficiaire.deleteMany({ where: { id: { in: [beneficiaireA.id, beneficiaireB.id] } } });
    await admin.scenario.deleteMany({ where: { id: { in: [scenarioA.id, scenarioB.id] } } });
    await admin.dependency.deleteMany({ where: { id: { in: [dependencyA.id, dependencyB.id] } } });
    await admin.metricSnapshot.deleteMany({ where: { id: { in: [metricSnapshotA.id, metricSnapshotB.id] } } });
    await admin.aiAgentInsight.deleteMany({ where: { id: { in: [aiAgentInsightA.id, aiAgentInsightB.id] } } });
    await admin.dashboardWidgetPreference.deleteMany({
      where: { id: { in: [dashboardWidgetPreferenceA.id, dashboardWidgetPreferenceB.id] } },
    });
    await admin.integrationEvent.deleteMany({ where: { id: { in: [integrationEventA.id, integrationEventB.id] } } });
    await admin.integration.deleteMany({ where: { id: { in: [integrationA.id, integrationB.id] } } });
    await admin.auditLog.deleteMany({ where: { id: { in: [auditLogA.id, auditLogB.id] } } });
    await admin.decisionOption.deleteMany({ where: { id: { in: [decisionOptionA.id, decisionOptionB.id] } } });
    await admin.decisionMatrix.deleteMany({ where: { id: { in: [decisionMatrixA.id, decisionMatrixB.id] } } });
    await admin.organizationalMemoryEntry.deleteMany({
      where: { id: { in: [organizationalMemoryEntryA.id, organizationalMemoryEntryB.id] } },
    });
    await admin.transformation.deleteMany({ where: { id: { in: [transformationA.id, transformationB.id] } } });
    await admin.dataClassification.deleteMany({
      where: { id: { in: [dataClassificationA.id, dataClassificationB.id] } },
    });
    await admin.orgDesignDraft.deleteMany({ where: { id: { in: [orgDesignDraftA.id, orgDesignDraftB.id] } } });
    await admin.pendingAiAction.deleteMany({ where: { id: { in: [pendingAiActionA.id, pendingAiActionB.id] } } });
    await admin.automationExecution.deleteMany({
      where: { id: { in: [automationExecutionA.id, automationExecutionB.id] } },
    });
    await admin.orchestrationPlaybook.deleteMany({
      where: { id: { in: [orchestrationPlaybookA.id, orchestrationPlaybookB.id] } },
    });
    await admin.automationCondition.deleteMany({
      where: { id: { in: [automationConditionA.id, automationConditionB.id] } },
    });
    await admin.automationRule.deleteMany({ where: { id: { in: [automationRuleA.id, automationRuleB.id] } } });
    await admin.courrier.deleteMany({ where: { id: { in: [courrierA.id, courrierB.id] } } });
    await admin.adminRequestApproval.deleteMany({
      where: { id: { in: [adminRequestApprovalA.id, adminRequestApprovalB.id] } },
    });
    await admin.adminRequestValidationRun.deleteMany({
      where: { id: { in: [adminRequestValidationRunA.id, adminRequestValidationRunB.id] } },
    });
    await admin.adminRequest.deleteMany({ where: { id: { in: [adminRequestA.id, adminRequestB.id] } } });
    await admin.taskApproval.deleteMany({ where: { id: { in: [taskApprovalA.id, taskApprovalB.id] } } });
    await admin.taskValidationRun.deleteMany({
      where: { id: { in: [taskValidationRunA.id, taskValidationRunB.id] } },
    });
    await admin.validationWorkflowStep.deleteMany({
      where: { id: { in: [validationWorkflowStepA.id, validationWorkflowStepB.id] } },
    });
    await admin.validationWorkflow.deleteMany({
      where: { id: { in: [validationWorkflowA.id, validationWorkflowB.id] } },
    });
    await admin.changeRequest.deleteMany({ where: { id: { in: [changeRequestA.id, changeRequestB.id] } } });
    await admin.incident.deleteMany({ where: { id: { in: [incidentA.id, incidentB.id] } } });
    await admin.auditFinding.deleteMany({ where: { id: { in: [auditFindingA.id, auditFindingB.id] } } });
    await admin.auditMission.deleteMany({ where: { id: { in: [auditMissionA.id, auditMissionB.id] } } });
    await admin.auditPlanDocument.deleteMany({
      where: { id: { in: [auditPlanDocumentA.id, auditPlanDocumentB.id] } },
    });
    await admin.auditPlanMember.deleteMany({ where: { planId: { in: [auditPlanA.id, auditPlanB.id] } } });
    await admin.auditPlan.deleteMany({ where: { id: { in: [auditPlanA.id, auditPlanB.id] } } });
    await admin.qualityClaim.deleteMany({ where: { id: { in: [qualityClaimA.id, qualityClaimB.id] } } });
    await admin.qualityChecklistItem.deleteMany({
      where: { id: { in: [qualityChecklistItemA.id, qualityChecklistItemB.id] } },
    });
    await admin.qualityControl.deleteMany({ where: { id: { in: [qualityControlA.id, qualityControlB.id] } } });
    await admin.qualityDocument.deleteMany({ where: { id: { in: [qualityDocumentA.id, qualityDocumentB.id] } } });
    await admin.nonConformiteAction.deleteMany({
      where: { id: { in: [nonConformiteActionA.id, nonConformiteActionB.id] } },
    });
    await admin.nonConformite.deleteMany({ where: { id: { in: [nonConformiteA.id, nonConformiteB.id] } } });
    await admin.complianceObligationDocument.deleteMany({
      where: { id: { in: [complianceObligationDocumentA.id, complianceObligationDocumentB.id] } },
    });
    await admin.complianceControl.deleteMany({
      where: { id: { in: [complianceControlA.id, complianceControlB.id] } },
    });
    await admin.complianceObligation.deleteMany({
      where: { id: { in: [complianceObligationA.id, complianceObligationB.id] } },
    });
    await admin.organizationalRisk.deleteMany({
      where: { id: { in: [organizationalRiskA.id, organizationalRiskB.id] } },
    });
    await admin.processusDocument.deleteMany({
      where: { id: { in: [processusDocumentA.id, processusDocumentB.id] } },
    });
    await admin.processusExecutionEtape.deleteMany({
      where: { id: { in: [processusExecutionEtapeA.id, processusExecutionEtapeB.id] } },
    });
    await admin.processusExecution.deleteMany({
      where: { id: { in: [processusExecutionA.id, processusExecutionB.id] } },
    });
    await admin.processusVersion.deleteMany({ where: { id: { in: [processusVersionA.id, processusVersionB.id] } } });
    await admin.processusEtape.deleteMany({ where: { id: { in: [processusEtapeA.id, processusEtapeB.id] } } });
    await admin.processus.deleteMany({ where: { id: { in: [processusA.id, processusB.id] } } });
    await admin.governanceDecision.deleteMany({
      where: { id: { in: [governanceDecisionA.id, governanceDecisionB.id] } },
    });
    await admin.governanceMeetingDocument.deleteMany({
      where: { id: { in: [governanceMeetingDocumentA.id, governanceMeetingDocumentB.id] } },
    });
    await admin.governanceMeetingParticipant.deleteMany({
      where: { meetingId: { in: [governanceMeetingA.id, governanceMeetingB.id] } },
    });
    await admin.governanceMeeting.deleteMany({
      where: { id: { in: [governanceMeetingA.id, governanceMeetingB.id] } },
    });
    await admin.governanceInstance.deleteMany({
      where: { id: { in: [governanceInstanceA.id, governanceInstanceB.id] } },
    });
    await admin.programmeRisk.deleteMany({ where: { id: { in: [programmeRiskA.id, programmeRiskB.id] } } });
    await admin.programme.deleteMany({ where: { id: { in: [programmeA.id, programmeB.id] } } });
    await admin.plan.deleteMany({ where: { id: { in: [planA.id, planB.id] } } });
    await admin.swotItem.deleteMany({ where: { id: { in: [swotItemA.id, swotItemB.id] } } });
    await admin.strategicAxis.deleteMany({ where: { id: { in: [strategicAxisA.id, strategicAxisB.id] } } });
    await admin.delegation.deleteMany({ where: { id: { in: [delegationA.id, delegationB.id] } } });
    await admin.site.deleteMany({ where: { id: { in: [siteA.id, siteB.id] } } });
    await admin.successionCandidate.deleteMany({
      where: { id: { in: [successionCandidateA.id, successionCandidateB.id] } },
    });
    await admin.successionPlan.deleteMany({ where: { id: { in: [successionPlanA.id, successionPlanB.id] } } });
    await admin.posteResponsabilite.deleteMany({
      where: { id: { in: [posteResponsabiliteA.id, posteResponsabiliteB.id] } },
    });
    await admin.poste.deleteMany({ where: { id: { in: [posteA.id, posteB.id] } } });
    await admin.decisionOutcome.deleteMany({ where: { id: { in: [decisionOutcomeA.id, decisionOutcomeB.id] } } });
    await admin.portalMessage.deleteMany({ where: { id: { in: [portalMessageA.id, portalMessageB.id] } } });
    await admin.contract.deleteMany({ where: { id: { in: [contractA.id, contractB.id] } } });
    await admin.crmInteraction.deleteMany({ where: { id: { in: [crmInteractionA.id, crmInteractionB.id] } } });
    await admin.crmOpportunity.deleteMany({ where: { id: { in: [crmOpportunityA.id, crmOpportunityB.id] } } });
    await admin.portalInviteToken.deleteMany({
      where: { id: { in: [portalInviteTokenA.id, portalInviteTokenB.id] } },
    });
    await admin.portalAccount.deleteMany({ where: { id: { in: [portalAccountA.id, portalAccountB.id] } } });
    await admin.crmOrganization.deleteMany({ where: { id: { in: [crmOrganizationA.id, crmOrganizationB.id] } } });
    await admin.notification.deleteMany({ where: { id: { in: [notificationA.id, notificationB.id] } } });
    await admin.reaction.deleteMany({ where: { id: { in: [reactionA.id, reactionB.id] } } });
    await admin.message.deleteMany({ where: { id: { in: [messageA.id, messageB.id] } } });
    await admin.conversationParticipant.deleteMany({
      where: { conversationId: { in: [conversationA.id, conversationB.id] } },
    });
    await admin.conversation.deleteMany({ where: { id: { in: [conversationA.id, conversationB.id] } } });
    await admin.evaluationCritere.deleteMany({
      where: { id: { in: [evaluationCritereA.id, evaluationCritereB.id] } },
    });
    await admin.evaluation.deleteMany({ where: { id: { in: [evaluationA.id, evaluationB.id] } } });
    await admin.indicator.deleteMany({ where: { id: { in: [indicatorA.id, indicatorB.id] } } });
    await admin.objective.deleteMany({ where: { id: { in: [objectiveA.id, objectiveB.id] } } });
    await admin.event.deleteMany({ where: { id: { in: [eventA.id, eventB.id] } } });
    await admin.leave.deleteMany({ where: { id: { in: [leaveA.id, leaveB.id] } } });
    await admin.knowledgeArticle.deleteMany({ where: { id: { in: [knowledgeArticleA.id, knowledgeArticleB.id] } } });
    await admin.knowledgeCategory.deleteMany({
      where: { id: { in: [knowledgeCategoryA.id, knowledgeCategoryB.id] } },
    });
    await admin.userCompetence.deleteMany({ where: { id: { in: [userCompetenceA.id, userCompetenceB.id] } } });
    await admin.competence.deleteMany({ where: { id: { in: [competenceA.id, competenceB.id] } } });
    await admin.meetingExternalParticipant.deleteMany({
      where: { id: { in: [meetingExternalParticipantA.id, meetingExternalParticipantB.id] } },
    });
    await admin.crmContact.deleteMany({ where: { id: { in: [crmContactA.id, crmContactB.id] } } });
    await admin.meetingDecision.deleteMany({ where: { id: { in: [meetingDecisionA.id, meetingDecisionB.id] } } });
    await admin.meetingParticipant.deleteMany({
      where: { meetingId: { in: [meetingA.id, meetingB.id] } },
    });
    await admin.documentVersion.deleteMany({ where: { id: { in: [documentVersionA.id, documentVersionB.id] } } });
    await admin.documentAccess.deleteMany({ where: { id: { in: [documentAccessA.id, documentAccessB.id] } } });
    await admin.taskDependency.deleteMany({ where: { id: { in: [taskDependencyA.id, taskDependencyB.id] } } });
    await admin.taskComment.deleteMany({ where: { id: { in: [taskCommentA.id, taskCommentB.id] } } });
    await admin.checklistItem.deleteMany({ where: { id: { in: [checklistItemA.id, checklistItemB.id] } } });
    await admin.taskAssignee.deleteMany({ where: { taskId: { in: [taskA.id, taskB.id] } } });
    await admin.sectionComment.deleteMany({ where: { id: { in: [sectionCommentA.id, sectionCommentB.id] } } });
    await admin.task.deleteMany({ where: { id: { in: [taskA2.id, taskB2.id] } } });
    await admin.whiteboard.deleteMany({ where: { id: { in: [whiteboardA.id, whiteboardB.id] } } });
    await admin.projectMember.deleteMany({ where: { id: { in: [projectMemberA.id, projectMemberB.id] } } });
    await admin.projectRisk.deleteMany({ where: { id: { in: [riskA.id, riskB.id] } } });
    await admin.projectMilestone.deleteMany({ where: { id: { in: [milestoneA.id, milestoneB.id] } } });
    await admin.projectDeliverable.deleteMany({ where: { id: { in: [deliverableA.id, deliverableB.id] } } });
    await admin.projectResource.deleteMany({ where: { id: { in: [resourceA.id, resourceB.id] } } });
    await admin.meeting.deleteMany({ where: { id: { in: [meetingA.id, meetingB.id] } } });
    await admin.documentFolder.deleteMany({ where: { id: { in: [folderA.id, folderB.id] } } });
    await admin.document.deleteMany({ where: { id: { in: [docA.id, docB.id] } } });
    await admin.projectSection.deleteMany({ where: { id: { in: [sectionA.id, sectionB.id] } } });
    await admin.task.deleteMany({ where: { id: { in: [taskA.id, taskB.id] } } });
    await admin.project.deleteMany({ where: { id: { in: [projectA.id, projectB.id] } } });
    await admin.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
    await admin.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await admin.department.deleteMany({ where: { id: { in: [deptA.id, deptB.id] } } });
    await admin.platformOrganization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    await admin.$disconnect();
  });

  it("un role non-proprietaire scope a l'organisation A ne voit que les lignes de A", async () => {
    const users = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.user.findMany({ where: { id: { in: [userA.id, userB.id] } } })
    );
    expect(users.map((u) => u.id)).toEqual([userA.id]);
  });

  it("un role non-proprietaire scope a l'organisation B ne voit que les lignes de B", async () => {
    const depts = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.department.findMany({ where: { id: { in: [deptA.id, deptB.id] } } })
    );
    expect(depts.map((d) => d.id)).toEqual([deptB.id]);
  });

  it("sans app.current_org_id defini, le role non-proprietaire ne voit AUCUNE ligne (deny-by-default)", async () => {
    const adapter = new PrismaPg({ connectionString: TENANT_ROLE_CONNECTION_STRING });
    const client = new PrismaClient({ adapter });
    try {
      const users = await client.user.findMany({ where: { id: { in: [userA.id, userB.id] } } });
      expect(users).toHaveLength(0);
    } finally {
      await client.$disconnect();
    }
  });

  it("le role non-proprietaire ne peut pas modifier une ligne hors de son organisation (WITH CHECK)", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.user.update({ where: { id: userB.id }, data: { name: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("le role proprietaire (admin) voit toujours toutes les lignes, RLS ou pas", async () => {
    const users = await admin.user.findMany({ where: { id: { in: [userA.id, userB.id] } } });
    expect(users.map((u) => u.id).sort()).toEqual([userA.id, userB.id].sort());
  });

  it("Team : un role scope a l'organisation A ne voit que les equipes de A", async () => {
    const teams = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.team.findMany({ where: { id: { in: [teamA.id, teamB.id] } } })
    );
    expect(teams.map((t) => t.id)).toEqual([teamA.id]);
  });

  it("Project : un role scope a l'organisation B ne voit que les projets de B", async () => {
    const projects = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.project.findMany({ where: { id: { in: [projectA.id, projectB.id] } } })
    );
    expect(projects.map((p) => p.id)).toEqual([projectB.id]);
  });

  it("Project : le role non-proprietaire ne peut pas modifier un projet hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.project.update({ where: { id: projectB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Task : un role scope a l'organisation A ne voit que les taches de A", async () => {
    const tasks = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.task.findMany({ where: { id: { in: [taskA.id, taskB.id] } } })
    );
    expect(tasks.map((t) => t.id)).toEqual([taskA.id]);
  });

  it("Task : le role non-proprietaire ne peut pas modifier une tache hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.task.update({ where: { id: taskB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ProjectSection : un role scope a l'organisation A ne voit que les sections de A", async () => {
    const sections = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.projectSection.findMany({ where: { id: { in: [sectionA.id, sectionB.id] } } })
    );
    expect(sections.map((s) => s.id)).toEqual([sectionA.id]);
  });

  it("Document : un role scope a l'organisation B ne voit que les documents de B", async () => {
    const docs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.document.findMany({ where: { id: { in: [docA.id, docB.id] } } })
    );
    expect(docs.map((d) => d.id)).toEqual([docB.id]);
  });

  it("Document : le role non-proprietaire ne peut pas modifier un document hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.document.update({ where: { id: docB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Meeting : un role scope a l'organisation A ne voit que les reunions de A", async () => {
    const meetings = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.meeting.findMany({ where: { id: { in: [meetingA.id, meetingB.id] } } })
    );
    expect(meetings.map((m) => m.id)).toEqual([meetingA.id]);
  });

  it("Meeting : le role non-proprietaire ne peut pas modifier une reunion hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.meeting.update({ where: { id: meetingB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("DocumentFolder : un role scope a l'organisation B ne voit que les dossiers de B", async () => {
    const folders = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.documentFolder.findMany({ where: { id: { in: [folderA.id, folderB.id] } } })
    );
    expect(folders.map((f) => f.id)).toEqual([folderB.id]);
  });

  it("DocumentFolder : le role non-proprietaire ne peut pas modifier un dossier hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.documentFolder.update({ where: { id: folderB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Whiteboard : un role scope a l'organisation A ne voit que le tableau blanc de A", async () => {
    const whiteboards = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.whiteboard.findMany({ where: { id: { in: [whiteboardA.id, whiteboardB.id] } } })
    );
    expect(whiteboards.map((w) => w.id)).toEqual([whiteboardA.id]);
  });

  it("ProjectMember : un role scope a l'organisation B ne voit que les membres de B", async () => {
    const members = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.projectMember.findMany({ where: { id: { in: [projectMemberA.id, projectMemberB.id] } } })
    );
    expect(members.map((m) => m.id)).toEqual([projectMemberB.id]);
  });

  it("ProjectMember : le role non-proprietaire ne peut pas modifier un membre hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.projectMember.update({ where: { id: projectMemberB.id }, data: { roleOnProject: "CHEF_PROJET" } })
      )
    ).rejects.toThrow();
  });

  it("ProjectRisk : un role scope a l'organisation A ne voit que les risques de A", async () => {
    const risks = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.projectRisk.findMany({ where: { id: { in: [riskA.id, riskB.id] } } })
    );
    expect(risks.map((r) => r.id)).toEqual([riskA.id]);
  });

  it("ProjectRisk : le role non-proprietaire ne peut pas modifier un risque hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.projectRisk.update({ where: { id: riskB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ProjectMilestone : un role scope a l'organisation B ne voit que les jalons de B", async () => {
    const milestones = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.projectMilestone.findMany({ where: { id: { in: [milestoneA.id, milestoneB.id] } } })
    );
    expect(milestones.map((m) => m.id)).toEqual([milestoneB.id]);
  });

  it("ProjectDeliverable : un role scope a l'organisation A ne voit que les livrables de A", async () => {
    const deliverables = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.projectDeliverable.findMany({ where: { id: { in: [deliverableA.id, deliverableB.id] } } })
    );
    expect(deliverables.map((d) => d.id)).toEqual([deliverableA.id]);
  });

  it("ProjectDeliverable : le role non-proprietaire ne peut pas modifier un livrable hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.projectDeliverable.update({ where: { id: deliverableB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ProjectResource : un role scope a l'organisation B ne voit que les ressources de B", async () => {
    const resources = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.projectResource.findMany({ where: { id: { in: [resourceA.id, resourceB.id] } } })
    );
    expect(resources.map((r) => r.id)).toEqual([resourceB.id]);
  });

  it("ProjectResource : le role non-proprietaire ne peut pas modifier une ressource hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.projectResource.update({ where: { id: resourceB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("SectionComment : un role scope a l'organisation A ne voit que les commentaires de A", async () => {
    const comments = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.sectionComment.findMany({ where: { id: { in: [sectionCommentA.id, sectionCommentB.id] } } })
    );
    expect(comments.map((c) => c.id)).toEqual([sectionCommentA.id]);
  });

  it("TaskAssignee : un role scope a l'organisation B ne voit que les affectations de B", async () => {
    const assignees = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.taskAssignee.findMany({ where: { taskId: { in: [taskA.id, taskB.id] } } })
    );
    expect(assignees.map((a) => a.taskId)).toEqual([taskB.id]);
  });

  it("TaskAssignee : le role non-proprietaire ne peut pas modifier une affectation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.taskAssignee.update({
          where: { taskId_userId: { taskId: taskB.id, userId: userB.id } },
          data: { organizationId: orgA.id },
        })
      )
    ).rejects.toThrow();
  });

  it("ChecklistItem : un role scope a l'organisation A ne voit que les items de A", async () => {
    const items = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.checklistItem.findMany({ where: { id: { in: [checklistItemA.id, checklistItemB.id] } } })
    );
    expect(items.map((i) => i.id)).toEqual([checklistItemA.id]);
  });

  it("TaskComment : un role scope a l'organisation B ne voit que les commentaires de B", async () => {
    const comments = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.taskComment.findMany({ where: { id: { in: [taskCommentA.id, taskCommentB.id] } } })
    );
    expect(comments.map((c) => c.id)).toEqual([taskCommentB.id]);
  });

  it("TaskComment : le role non-proprietaire ne peut pas modifier un commentaire hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.taskComment.update({ where: { id: taskCommentB.id }, data: { content: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("TaskDependency : un role scope a l'organisation A ne voit que les dependances de A", async () => {
    const deps = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.taskDependency.findMany({ where: { id: { in: [taskDependencyA.id, taskDependencyB.id] } } })
    );
    expect(deps.map((d) => d.id)).toEqual([taskDependencyA.id]);
  });

  it("DocumentAccess : un role scope a l'organisation B ne voit que les acces de B", async () => {
    const accesses = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.documentAccess.findMany({ where: { id: { in: [documentAccessA.id, documentAccessB.id] } } })
    );
    expect(accesses.map((a) => a.id)).toEqual([documentAccessB.id]);
  });

  it("DocumentVersion : un role scope a l'organisation A ne voit que les versions de A", async () => {
    const versions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.documentVersion.findMany({ where: { id: { in: [documentVersionA.id, documentVersionB.id] } } })
    );
    expect(versions.map((v) => v.id)).toEqual([documentVersionA.id]);
  });

  it("DocumentVersion : le role non-proprietaire ne peut pas modifier une version hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.documentVersion.update({ where: { id: documentVersionB.id }, data: { note: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("MeetingParticipant : un role scope a l'organisation B ne voit que les participants de B", async () => {
    const participants = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.meetingParticipant.findMany({ where: { meetingId: { in: [meetingA.id, meetingB.id] } } })
    );
    expect(participants.map((p) => p.meetingId)).toEqual([meetingB.id]);
  });

  it("MeetingDecision : un role scope a l'organisation A ne voit que les decisions de A", async () => {
    const decisions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.meetingDecision.findMany({ where: { id: { in: [meetingDecisionA.id, meetingDecisionB.id] } } })
    );
    expect(decisions.map((d) => d.id)).toEqual([meetingDecisionA.id]);
  });

  it("MeetingDecision : le role non-proprietaire ne peut pas modifier une decision hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.meetingDecision.update({ where: { id: meetingDecisionB.id }, data: { description: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("MeetingExternalParticipant : un role scope a l'organisation B ne voit que les participants externes de B", async () => {
    const participants = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.meetingExternalParticipant.findMany({
        where: { id: { in: [meetingExternalParticipantA.id, meetingExternalParticipantB.id] } },
      })
    );
    expect(participants.map((p) => p.id)).toEqual([meetingExternalParticipantB.id]);
  });

  it("Competence : un role scope a l'organisation A ne voit que les competences de A", async () => {
    const competences = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.competence.findMany({ where: { id: { in: [competenceA.id, competenceB.id] } } })
    );
    expect(competences.map((c) => c.id)).toEqual([competenceA.id]);
  });

  it("Competence : le role non-proprietaire ne peut pas modifier une competence hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.competence.update({ where: { id: competenceB.id }, data: { categorie: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("UserCompetence : un role scope a l'organisation B ne voit que les competences utilisateur de B", async () => {
    const items = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.userCompetence.findMany({ where: { id: { in: [userCompetenceA.id, userCompetenceB.id] } } })
    );
    expect(items.map((i) => i.id)).toEqual([userCompetenceB.id]);
  });

  it("KnowledgeCategory : un role scope a l'organisation A ne voit que les categories de A", async () => {
    const categories = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.knowledgeCategory.findMany({ where: { id: { in: [knowledgeCategoryA.id, knowledgeCategoryB.id] } } })
    );
    expect(categories.map((c) => c.id)).toEqual([knowledgeCategoryA.id]);
  });

  it("KnowledgeArticle : un role scope a l'organisation B ne voit que les articles de B", async () => {
    const articles = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.knowledgeArticle.findMany({ where: { id: { in: [knowledgeArticleA.id, knowledgeArticleB.id] } } })
    );
    expect(articles.map((a) => a.id)).toEqual([knowledgeArticleB.id]);
  });

  it("KnowledgeArticle : le role non-proprietaire ne peut pas modifier un article hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.knowledgeArticle.update({ where: { id: knowledgeArticleB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Leave : un role scope a l'organisation A ne voit que les conges de A", async () => {
    const leaves = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.leave.findMany({ where: { id: { in: [leaveA.id, leaveB.id] } } })
    );
    expect(leaves.map((l) => l.id)).toEqual([leaveA.id]);
  });

  it("Leave : le role non-proprietaire ne peut pas modifier un conge hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.leave.update({ where: { id: leaveB.id }, data: { motif: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Event : un role scope a l'organisation B ne voit que les evenements de B", async () => {
    const events = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.event.findMany({ where: { id: { in: [eventA.id, eventB.id] } } })
    );
    expect(events.map((e) => e.id)).toEqual([eventB.id]);
  });

  it("Objective : un role scope a l'organisation A ne voit que les objectifs de A", async () => {
    const objectives = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.objective.findMany({ where: { id: { in: [objectiveA.id, objectiveB.id] } } })
    );
    expect(objectives.map((o) => o.id)).toEqual([objectiveA.id]);
  });

  it("Objective : le role non-proprietaire ne peut pas modifier un objectif hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.objective.update({ where: { id: objectiveB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Indicator : un role scope a l'organisation B ne voit que les indicateurs de B", async () => {
    const indicators = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.indicator.findMany({ where: { id: { in: [indicatorA.id, indicatorB.id] } } })
    );
    expect(indicators.map((i) => i.id)).toEqual([indicatorB.id]);
  });

  it("Evaluation : un role scope a l'organisation A ne voit que les evaluations de A", async () => {
    const evaluations = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.evaluation.findMany({ where: { id: { in: [evaluationA.id, evaluationB.id] } } })
    );
    expect(evaluations.map((e) => e.id)).toEqual([evaluationA.id]);
  });

  it("Evaluation : le role non-proprietaire ne peut pas modifier une evaluation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.evaluation.update({ where: { id: evaluationB.id }, data: { pointsForts: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("EvaluationCritere : un role scope a l'organisation B ne voit que les criteres de B", async () => {
    const criteres = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.evaluationCritere.findMany({ where: { id: { in: [evaluationCritereA.id, evaluationCritereB.id] } } })
    );
    expect(criteres.map((c) => c.id)).toEqual([evaluationCritereB.id]);
  });

  it("Conversation : un role scope a l'organisation A ne voit que les conversations de A", async () => {
    const conversations = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.conversation.findMany({ where: { id: { in: [conversationA.id, conversationB.id] } } })
    );
    expect(conversations.map((c) => c.id)).toEqual([conversationA.id]);
  });

  it("Conversation : le role non-proprietaire ne peut pas modifier une conversation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.conversation.update({ where: { id: conversationB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Message : un role scope a l'organisation B ne voit que les messages de B", async () => {
    const messages = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.message.findMany({ where: { id: { in: [messageA.id, messageB.id] } } })
    );
    expect(messages.map((m) => m.id)).toEqual([messageB.id]);
  });

  it("Message : le role non-proprietaire ne peut pas modifier un message hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.message.update({ where: { id: messageB.id }, data: { content: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Reaction : un role scope a l'organisation A ne voit que les reactions de A", async () => {
    const reactions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.reaction.findMany({ where: { id: { in: [reactionA.id, reactionB.id] } } })
    );
    expect(reactions.map((r) => r.id)).toEqual([reactionA.id]);
  });

  it("Notification : un role scope a l'organisation B ne voit que les notifications de B", async () => {
    const notifications = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.notification.findMany({ where: { id: { in: [notificationA.id, notificationB.id] } } })
    );
    expect(notifications.map((n) => n.id)).toEqual([notificationB.id]);
  });

  it("Notification : le role non-proprietaire ne peut pas modifier une notification hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.notification.update({ where: { id: notificationB.id }, data: { isRead: true } })
      )
    ).rejects.toThrow();
  });

  it("CrmOrganization : un role scope a l'organisation A ne voit que les organisations CRM de A", async () => {
    const orgs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.crmOrganization.findMany({ where: { id: { in: [crmOrganizationA.id, crmOrganizationB.id] } } })
    );
    expect(orgs.map((o) => o.id)).toEqual([crmOrganizationA.id]);
  });

  it("CrmContact : un role scope a l'organisation B ne voit que les contacts CRM de B", async () => {
    const contacts = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.crmContact.findMany({ where: { id: { in: [crmContactA.id, crmContactB.id] } } })
    );
    expect(contacts.map((c) => c.id)).toEqual([crmContactB.id]);
  });

  it("CrmContact : le role non-proprietaire ne peut pas modifier un contact CRM hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.crmContact.update({ where: { id: crmContactB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("PortalAccount : un role scope a l'organisation A ne voit que les comptes portail de A", async () => {
    const accounts = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.portalAccount.findMany({ where: { id: { in: [portalAccountA.id, portalAccountB.id] } } })
    );
    expect(accounts.map((a) => a.id)).toEqual([portalAccountA.id]);
  });

  it("PortalInviteToken : un role scope a l'organisation B ne voit que les tokens de B", async () => {
    const tokens = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.portalInviteToken.findMany({ where: { id: { in: [portalInviteTokenA.id, portalInviteTokenB.id] } } })
    );
    expect(tokens.map((t) => t.id)).toEqual([portalInviteTokenB.id]);
  });

  it("CrmOpportunity : un role scope a l'organisation A ne voit que les opportunites de A", async () => {
    const opportunities = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.crmOpportunity.findMany({ where: { id: { in: [crmOpportunityA.id, crmOpportunityB.id] } } })
    );
    expect(opportunities.map((o) => o.id)).toEqual([crmOpportunityA.id]);
  });

  it("CrmOpportunity : le role non-proprietaire ne peut pas modifier une opportunite hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.crmOpportunity.update({ where: { id: crmOpportunityB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("CrmInteraction : un role scope a l'organisation B ne voit que les interactions de B", async () => {
    const interactions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.crmInteraction.findMany({ where: { id: { in: [crmInteractionA.id, crmInteractionB.id] } } })
    );
    expect(interactions.map((i) => i.id)).toEqual([crmInteractionB.id]);
  });

  it("Contract : un role scope a l'organisation A ne voit que les contrats de A", async () => {
    const contracts = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.contract.findMany({ where: { id: { in: [contractA.id, contractB.id] } } })
    );
    expect(contracts.map((c) => c.id)).toEqual([contractA.id]);
  });

  it("Contract : le role non-proprietaire ne peut pas modifier un contrat hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.contract.update({ where: { id: contractB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("PortalMessage : un role scope a l'organisation B ne voit que les messages portail de B", async () => {
    const messages = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.portalMessage.findMany({ where: { id: { in: [portalMessageA.id, portalMessageB.id] } } })
    );
    expect(messages.map((m) => m.id)).toEqual([portalMessageB.id]);
  });

  it("DecisionOutcome : un role scope a l'organisation A ne voit que les decisions de A", async () => {
    const decisions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.decisionOutcome.findMany({ where: { id: { in: [decisionOutcomeA.id, decisionOutcomeB.id] } } })
    );
    expect(decisions.map((d) => d.id)).toEqual([decisionOutcomeA.id]);
  });

  it("Poste : un role scope a l'organisation B ne voit que les postes de B", async () => {
    const postes = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.poste.findMany({ where: { id: { in: [posteA.id, posteB.id] } } })
    );
    expect(postes.map((p) => p.id)).toEqual([posteB.id]);
  });

  it("Poste : le role non-proprietaire ne peut pas modifier un poste hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.poste.update({ where: { id: posteB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("PosteResponsabilite : un role scope a l'organisation A ne voit que les responsabilites de A", async () => {
    const items = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.posteResponsabilite.findMany({ where: { id: { in: [posteResponsabiliteA.id, posteResponsabiliteB.id] } } })
    );
    expect(items.map((i) => i.id)).toEqual([posteResponsabiliteA.id]);
  });

  it("SuccessionPlan : un role scope a l'organisation B ne voit que les plans de succession de B", async () => {
    const plans = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.successionPlan.findMany({ where: { id: { in: [successionPlanA.id, successionPlanB.id] } } })
    );
    expect(plans.map((p) => p.id)).toEqual([successionPlanB.id]);
  });

  it("SuccessionCandidate : un role scope a l'organisation A ne voit que les candidats de A", async () => {
    const candidates = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.successionCandidate.findMany({ where: { id: { in: [successionCandidateA.id, successionCandidateB.id] } } })
    );
    expect(candidates.map((c) => c.id)).toEqual([successionCandidateA.id]);
  });

  it("Site : un role scope a l'organisation B ne voit que les sites de B", async () => {
    const sites = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.site.findMany({ where: { id: { in: [siteA.id, siteB.id] } } })
    );
    expect(sites.map((s) => s.id)).toEqual([siteB.id]);
  });

  it("Delegation : un role scope a l'organisation A ne voit que les delegations de A", async () => {
    const delegations = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.delegation.findMany({ where: { id: { in: [delegationA.id, delegationB.id] } } })
    );
    expect(delegations.map((d) => d.id)).toEqual([delegationA.id]);
  });

  it("Delegation : le role non-proprietaire ne peut pas modifier une delegation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.delegation.update({ where: { id: delegationB.id }, data: { motif: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("StrategicAxis : un role scope a l'organisation B ne voit que les axes de B", async () => {
    const axes = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.strategicAxis.findMany({ where: { id: { in: [strategicAxisA.id, strategicAxisB.id] } } })
    );
    expect(axes.map((a) => a.id)).toEqual([strategicAxisB.id]);
  });

  it("SwotItem : un role scope a l'organisation A ne voit que les items SWOT de A", async () => {
    const items = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.swotItem.findMany({ where: { id: { in: [swotItemA.id, swotItemB.id] } } })
    );
    expect(items.map((i) => i.id)).toEqual([swotItemA.id]);
  });

  it("Plan : un role scope a l'organisation B ne voit que les plans de B", async () => {
    const plans = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.plan.findMany({ where: { id: { in: [planA.id, planB.id] } } })
    );
    expect(plans.map((p) => p.id)).toEqual([planB.id]);
  });

  it("Plan : le role non-proprietaire ne peut pas modifier un plan hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.plan.update({ where: { id: planB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Programme : un role scope a l'organisation A ne voit que les programmes de A", async () => {
    const programmes = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.programme.findMany({ where: { id: { in: [programmeA.id, programmeB.id] } } })
    );
    expect(programmes.map((p) => p.id)).toEqual([programmeA.id]);
  });

  it("ProgrammeRisk : un role scope a l'organisation B ne voit que les risques programme de B", async () => {
    const risks = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.programmeRisk.findMany({ where: { id: { in: [programmeRiskA.id, programmeRiskB.id] } } })
    );
    expect(risks.map((r) => r.id)).toEqual([programmeRiskB.id]);
  });

  it("GovernanceInstance : un role scope a l'organisation A ne voit que les instances de A", async () => {
    const instances = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.governanceInstance.findMany({ where: { id: { in: [governanceInstanceA.id, governanceInstanceB.id] } } })
    );
    expect(instances.map((i) => i.id)).toEqual([governanceInstanceA.id]);
  });

  it("GovernanceInstance : le role non-proprietaire ne peut pas modifier une instance hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.governanceInstance.update({ where: { id: governanceInstanceB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("GovernanceMeeting : un role scope a l'organisation B ne voit que les reunions de gouvernance de B", async () => {
    const meetings = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.governanceMeeting.findMany({ where: { id: { in: [governanceMeetingA.id, governanceMeetingB.id] } } })
    );
    expect(meetings.map((m) => m.id)).toEqual([governanceMeetingB.id]);
  });

  it("GovernanceMeetingParticipant : un role scope a l'organisation A ne voit que les participants de A", async () => {
    const participants = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.governanceMeetingParticipant.findMany({
        where: { meetingId: { in: [governanceMeetingA.id, governanceMeetingB.id] } },
      })
    );
    expect(participants.map((p) => p.meetingId)).toEqual([governanceMeetingA.id]);
  });

  it("GovernanceMeetingDocument : un role scope a l'organisation B ne voit que les documents de B", async () => {
    const docs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.governanceMeetingDocument.findMany({
        where: { id: { in: [governanceMeetingDocumentA.id, governanceMeetingDocumentB.id] } },
      })
    );
    expect(docs.map((d) => d.id)).toEqual([governanceMeetingDocumentB.id]);
  });

  it("GovernanceDecision : un role scope a l'organisation A ne voit que les decisions de A", async () => {
    const decisions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.governanceDecision.findMany({ where: { id: { in: [governanceDecisionA.id, governanceDecisionB.id] } } })
    );
    expect(decisions.map((d) => d.id)).toEqual([governanceDecisionA.id]);
  });

  it("GovernanceDecision : le role non-proprietaire ne peut pas modifier une decision hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.governanceDecision.update({ where: { id: governanceDecisionB.id }, data: { objet: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Processus : un role scope a l'organisation B ne voit que les processus de B", async () => {
    const processus = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.processus.findMany({ where: { id: { in: [processusA.id, processusB.id] } } })
    );
    expect(processus.map((p) => p.id)).toEqual([processusB.id]);
  });

  it("Processus : le role non-proprietaire ne peut pas modifier un processus hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.processus.update({ where: { id: processusB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ProcessusEtape : un role scope a l'organisation A ne voit que les etapes de A", async () => {
    const etapes = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.processusEtape.findMany({ where: { id: { in: [processusEtapeA.id, processusEtapeB.id] } } })
    );
    expect(etapes.map((e) => e.id)).toEqual([processusEtapeA.id]);
  });

  it("ProcessusVersion : un role scope a l'organisation B ne voit que les versions de B", async () => {
    const versions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.processusVersion.findMany({ where: { id: { in: [processusVersionA.id, processusVersionB.id] } } })
    );
    expect(versions.map((v) => v.id)).toEqual([processusVersionB.id]);
  });

  it("ProcessusExecution : un role scope a l'organisation A ne voit que les executions de A", async () => {
    const executions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.processusExecution.findMany({ where: { id: { in: [processusExecutionA.id, processusExecutionB.id] } } })
    );
    expect(executions.map((e) => e.id)).toEqual([processusExecutionA.id]);
  });

  it("ProcessusExecutionEtape : un role scope a l'organisation B ne voit que les etapes d'execution de B", async () => {
    const items = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.processusExecutionEtape.findMany({
        where: { id: { in: [processusExecutionEtapeA.id, processusExecutionEtapeB.id] } },
      })
    );
    expect(items.map((i) => i.id)).toEqual([processusExecutionEtapeB.id]);
  });

  it("ProcessusDocument : un role scope a l'organisation A ne voit que les documents de A", async () => {
    const docs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.processusDocument.findMany({ where: { id: { in: [processusDocumentA.id, processusDocumentB.id] } } })
    );
    expect(docs.map((d) => d.id)).toEqual([processusDocumentA.id]);
  });

  it("OrganizationalRisk : un role scope a l'organisation B ne voit que les risques de B", async () => {
    const risks = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.organizationalRisk.findMany({ where: { id: { in: [organizationalRiskA.id, organizationalRiskB.id] } } })
    );
    expect(risks.map((r) => r.id)).toEqual([organizationalRiskB.id]);
  });

  it("OrganizationalRisk : le role non-proprietaire ne peut pas modifier un risque hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.organizationalRisk.update({ where: { id: organizationalRiskB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ComplianceObligation : un role scope a l'organisation A ne voit que les obligations de A", async () => {
    const obligations = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.complianceObligation.findMany({ where: { id: { in: [complianceObligationA.id, complianceObligationB.id] } } })
    );
    expect(obligations.map((o) => o.id)).toEqual([complianceObligationA.id]);
  });

  it("ComplianceObligation : le role non-proprietaire ne peut pas modifier une obligation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.complianceObligation.update({ where: { id: complianceObligationB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ComplianceControl : un role scope a l'organisation B ne voit que les controles de B", async () => {
    const controls = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.complianceControl.findMany({ where: { id: { in: [complianceControlA.id, complianceControlB.id] } } })
    );
    expect(controls.map((c) => c.id)).toEqual([complianceControlB.id]);
  });

  it("ComplianceObligationDocument : un role scope a l'organisation A ne voit que les documents de A", async () => {
    const docs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.complianceObligationDocument.findMany({
        where: { id: { in: [complianceObligationDocumentA.id, complianceObligationDocumentB.id] } },
      })
    );
    expect(docs.map((d) => d.id)).toEqual([complianceObligationDocumentA.id]);
  });

  it("NonConformite : un role scope a l'organisation B ne voit que les non-conformites de B", async () => {
    const ncs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.nonConformite.findMany({ where: { id: { in: [nonConformiteA.id, nonConformiteB.id] } } })
    );
    expect(ncs.map((n) => n.id)).toEqual([nonConformiteB.id]);
  });

  it("NonConformite : le role non-proprietaire ne peut pas modifier une non-conformite hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.nonConformite.update({ where: { id: nonConformiteB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("NonConformiteAction : un role scope a l'organisation A ne voit que les actions de A", async () => {
    const actions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.nonConformiteAction.findMany({ where: { id: { in: [nonConformiteActionA.id, nonConformiteActionB.id] } } })
    );
    expect(actions.map((a) => a.id)).toEqual([nonConformiteActionA.id]);
  });

  it("QualityDocument : un role scope a l'organisation B ne voit que les documents qualite de B", async () => {
    const docs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.qualityDocument.findMany({ where: { id: { in: [qualityDocumentA.id, qualityDocumentB.id] } } })
    );
    expect(docs.map((d) => d.id)).toEqual([qualityDocumentB.id]);
  });

  it("QualityControl : un role scope a l'organisation A ne voit que les controles qualite de A", async () => {
    const controls = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.qualityControl.findMany({ where: { id: { in: [qualityControlA.id, qualityControlB.id] } } })
    );
    expect(controls.map((c) => c.id)).toEqual([qualityControlA.id]);
  });

  it("QualityChecklistItem : un role scope a l'organisation B ne voit que les items de B", async () => {
    const items = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.qualityChecklistItem.findMany({ where: { id: { in: [qualityChecklistItemA.id, qualityChecklistItemB.id] } } })
    );
    expect(items.map((i) => i.id)).toEqual([qualityChecklistItemB.id]);
  });

  it("QualityClaim : un role scope a l'organisation A ne voit que les reclamations de A", async () => {
    const claims = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.qualityClaim.findMany({ where: { id: { in: [qualityClaimA.id, qualityClaimB.id] } } })
    );
    expect(claims.map((c) => c.id)).toEqual([qualityClaimA.id]);
  });

  it("QualityClaim : le role non-proprietaire ne peut pas modifier une reclamation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.qualityClaim.update({ where: { id: qualityClaimB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("AuditPlan : un role scope a l'organisation B ne voit que les plans d'audit de B", async () => {
    const plans = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.auditPlan.findMany({ where: { id: { in: [auditPlanA.id, auditPlanB.id] } } })
    );
    expect(plans.map((p) => p.id)).toEqual([auditPlanB.id]);
  });

  it("AuditPlanMember : un role scope a l'organisation A ne voit que les membres de A", async () => {
    const members = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.auditPlanMember.findMany({ where: { planId: { in: [auditPlanA.id, auditPlanB.id] } } })
    );
    expect(members.map((m) => m.planId)).toEqual([auditPlanA.id]);
  });

  it("AuditPlanDocument : un role scope a l'organisation B ne voit que les documents de B", async () => {
    const docs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.auditPlanDocument.findMany({ where: { id: { in: [auditPlanDocumentA.id, auditPlanDocumentB.id] } } })
    );
    expect(docs.map((d) => d.id)).toEqual([auditPlanDocumentB.id]);
  });

  it("AuditMission : un role scope a l'organisation A ne voit que les missions de A", async () => {
    const missions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.auditMission.findMany({ where: { id: { in: [auditMissionA.id, auditMissionB.id] } } })
    );
    expect(missions.map((m) => m.id)).toEqual([auditMissionA.id]);
  });

  it("AuditFinding : un role scope a l'organisation B ne voit que les constats de B", async () => {
    const findings = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.auditFinding.findMany({ where: { id: { in: [auditFindingA.id, auditFindingB.id] } } })
    );
    expect(findings.map((f) => f.id)).toEqual([auditFindingB.id]);
  });

  it("Incident : un role scope a l'organisation A ne voit que les incidents de A", async () => {
    const incidents = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.incident.findMany({ where: { id: { in: [incidentA.id, incidentB.id] } } })
    );
    expect(incidents.map((i) => i.id)).toEqual([incidentA.id]);
  });

  it("Incident : le role non-proprietaire ne peut pas modifier un incident hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.incident.update({ where: { id: incidentB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ChangeRequest : un role scope a l'organisation B ne voit que les demandes de changement de B", async () => {
    const changes = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.changeRequest.findMany({ where: { id: { in: [changeRequestA.id, changeRequestB.id] } } })
    );
    expect(changes.map((c) => c.id)).toEqual([changeRequestB.id]);
  });

  it("ChangeRequest : le role non-proprietaire ne peut pas modifier une demande de changement hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.changeRequest.update({ where: { id: changeRequestB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ValidationWorkflow : un role scope a l'organisation A ne voit que les circuits de A", async () => {
    const workflows = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.validationWorkflow.findMany({ where: { id: { in: [validationWorkflowA.id, validationWorkflowB.id] } } })
    );
    expect(workflows.map((w) => w.id)).toEqual([validationWorkflowA.id]);
  });

  it("ValidationWorkflow : le role non-proprietaire ne peut pas modifier un circuit hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.validationWorkflow.update({ where: { id: validationWorkflowB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ValidationWorkflowStep : un role scope a l'organisation B ne voit que les etapes de B", async () => {
    const steps = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.validationWorkflowStep.findMany({
        where: { id: { in: [validationWorkflowStepA.id, validationWorkflowStepB.id] } },
      })
    );
    expect(steps.map((s) => s.id)).toEqual([validationWorkflowStepB.id]);
  });

  it("TaskValidationRun : un role scope a l'organisation A ne voit que les instances de A", async () => {
    const runs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.taskValidationRun.findMany({ where: { id: { in: [taskValidationRunA.id, taskValidationRunB.id] } } })
    );
    expect(runs.map((r) => r.id)).toEqual([taskValidationRunA.id]);
  });

  it("TaskApproval : un role scope a l'organisation B ne voit que les approbations de B", async () => {
    const approvals = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.taskApproval.findMany({ where: { id: { in: [taskApprovalA.id, taskApprovalB.id] } } })
    );
    expect(approvals.map((a) => a.id)).toEqual([taskApprovalB.id]);
  });

  it("AdminRequest : un role scope a l'organisation A ne voit que les demandes de A", async () => {
    const requests = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.adminRequest.findMany({ where: { id: { in: [adminRequestA.id, adminRequestB.id] } } })
    );
    expect(requests.map((r) => r.id)).toEqual([adminRequestA.id]);
  });

  it("AdminRequest : le role non-proprietaire ne peut pas modifier une demande hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.adminRequest.update({ where: { id: adminRequestB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("AdminRequestValidationRun : un role scope a l'organisation B ne voit que les instances de B", async () => {
    const runs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.adminRequestValidationRun.findMany({
        where: { id: { in: [adminRequestValidationRunA.id, adminRequestValidationRunB.id] } },
      })
    );
    expect(runs.map((r) => r.id)).toEqual([adminRequestValidationRunB.id]);
  });

  it("AdminRequestApproval : un role scope a l'organisation A ne voit que les approbations de A", async () => {
    const approvals = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.adminRequestApproval.findMany({
        where: { id: { in: [adminRequestApprovalA.id, adminRequestApprovalB.id] } },
      })
    );
    expect(approvals.map((a) => a.id)).toEqual([adminRequestApprovalA.id]);
  });

  it("Courrier : un role scope a l'organisation B ne voit que les courriers de B", async () => {
    const courriers = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.courrier.findMany({ where: { id: { in: [courrierA.id, courrierB.id] } } })
    );
    expect(courriers.map((c) => c.id)).toEqual([courrierB.id]);
  });

  it("Courrier : le role non-proprietaire ne peut pas modifier un courrier hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.courrier.update({ where: { id: courrierB.id }, data: { objet: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("AutomationRule : un role scope a l'organisation A ne voit que les regles de A", async () => {
    const rules = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.automationRule.findMany({ where: { id: { in: [automationRuleA.id, automationRuleB.id] } } })
    );
    expect(rules.map((r) => r.id)).toEqual([automationRuleA.id]);
  });

  it("AutomationRule : le role non-proprietaire ne peut pas modifier une regle hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.automationRule.update({ where: { id: automationRuleB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("AutomationCondition : un role scope a l'organisation B ne voit que les conditions de B", async () => {
    const conditions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.automationCondition.findMany({ where: { id: { in: [automationConditionA.id, automationConditionB.id] } } })
    );
    expect(conditions.map((c) => c.id)).toEqual([automationConditionB.id]);
  });

  it("OrchestrationPlaybook : un role scope a l'organisation A ne voit que les playbooks de A", async () => {
    const playbooks = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.orchestrationPlaybook.findMany({ where: { id: { in: [orchestrationPlaybookA.id, orchestrationPlaybookB.id] } } })
    );
    expect(playbooks.map((p) => p.id)).toEqual([orchestrationPlaybookA.id]);
  });

  it("AutomationExecution : un role scope a l'organisation B ne voit que les executions de B", async () => {
    const executions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.automationExecution.findMany({ where: { id: { in: [automationExecutionA.id, automationExecutionB.id] } } })
    );
    expect(executions.map((e) => e.id)).toEqual([automationExecutionB.id]);
  });

  it("PendingAiAction : un role scope a l'organisation A ne voit que les actions IA de A", async () => {
    const actions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.pendingAiAction.findMany({ where: { id: { in: [pendingAiActionA.id, pendingAiActionB.id] } } })
    );
    expect(actions.map((a) => a.id)).toEqual([pendingAiActionA.id]);
  });

  it("PendingAiAction : le role non-proprietaire ne peut pas modifier une action IA hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.pendingAiAction.update({ where: { id: pendingAiActionB.id }, data: { statut: "APPROUVE" } })
      )
    ).rejects.toThrow();
  });

  it("OrgDesignDraft : un role scope a l'organisation A ne voit que les brouillons de A", async () => {
    const drafts = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.orgDesignDraft.findMany({ where: { id: { in: [orgDesignDraftA.id, orgDesignDraftB.id] } } })
    );
    expect(drafts.map((d) => d.id)).toEqual([orgDesignDraftA.id]);
  });

  it("DataClassification : un role scope a l'organisation B ne voit que les classifications de B", async () => {
    const items = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.dataClassification.findMany({ where: { id: { in: [dataClassificationA.id, dataClassificationB.id] } } })
    );
    expect(items.map((i) => i.id)).toEqual([dataClassificationB.id]);
  });

  it("Transformation : un role scope a l'organisation A ne voit que les transformations de A", async () => {
    const transformations = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.transformation.findMany({ where: { id: { in: [transformationA.id, transformationB.id] } } })
    );
    expect(transformations.map((t) => t.id)).toEqual([transformationA.id]);
  });

  it("Transformation : le role non-proprietaire ne peut pas modifier une transformation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.transformation.update({ where: { id: transformationB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("OrganizationalMemoryEntry : un role scope a l'organisation B ne voit que les entrees de B", async () => {
    const entries = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.organizationalMemoryEntry.findMany({
        where: { id: { in: [organizationalMemoryEntryA.id, organizationalMemoryEntryB.id] } },
      })
    );
    expect(entries.map((e) => e.id)).toEqual([organizationalMemoryEntryB.id]);
  });

  it("DecisionMatrix : un role scope a l'organisation A ne voit que les matrices de A", async () => {
    const matrices = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.decisionMatrix.findMany({ where: { id: { in: [decisionMatrixA.id, decisionMatrixB.id] } } })
    );
    expect(matrices.map((m) => m.id)).toEqual([decisionMatrixA.id]);
  });

  it("DecisionOption : un role scope a l'organisation B ne voit que les options de B", async () => {
    const options = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.decisionOption.findMany({ where: { id: { in: [decisionOptionA.id, decisionOptionB.id] } } })
    );
    expect(options.map((o) => o.id)).toEqual([decisionOptionB.id]);
  });

  it("AuditLog : un role scope a l'organisation A ne voit que les journaux de A", async () => {
    const logs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.auditLog.findMany({ where: { id: { in: [auditLogA.id, auditLogB.id] } } })
    );
    expect(logs.map((l) => l.id)).toEqual([auditLogA.id]);
  });

  it("Integration : un role scope a l'organisation B ne voit que les integrations de B", async () => {
    const integrations = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.integration.findMany({ where: { id: { in: [integrationA.id, integrationB.id] } } })
    );
    expect(integrations.map((i) => i.id)).toEqual([integrationB.id]);
  });

  it("Integration : le role non-proprietaire ne peut pas modifier une integration hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.integration.update({ where: { id: integrationB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("IntegrationEvent : un role scope a l'organisation A ne voit que les evenements de A", async () => {
    const events = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.integrationEvent.findMany({ where: { id: { in: [integrationEventA.id, integrationEventB.id] } } })
    );
    expect(events.map((e) => e.id)).toEqual([integrationEventA.id]);
  });

  it("DashboardWidgetPreference : un role scope a l'organisation B ne voit que les preferences de B", async () => {
    const prefs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.dashboardWidgetPreference.findMany({
        where: { id: { in: [dashboardWidgetPreferenceA.id, dashboardWidgetPreferenceB.id] } },
      })
    );
    expect(prefs.map((p) => p.id)).toEqual([dashboardWidgetPreferenceB.id]);
  });

  it("AiAgentInsight : un role scope a l'organisation A ne voit que les insights de A", async () => {
    const insights = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.aiAgentInsight.findMany({ where: { id: { in: [aiAgentInsightA.id, aiAgentInsightB.id] } } })
    );
    expect(insights.map((i) => i.id)).toEqual([aiAgentInsightA.id]);
  });

  it("MetricSnapshot : un role scope a l'organisation B ne voit que les instantanes de B", async () => {
    const snapshots = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.metricSnapshot.findMany({ where: { id: { in: [metricSnapshotA.id, metricSnapshotB.id] } } })
    );
    expect(snapshots.map((s) => s.id)).toEqual([metricSnapshotB.id]);
  });

  it("Dependency : un role scope a l'organisation A ne voit que les dependances de A", async () => {
    const deps = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.dependency.findMany({ where: { id: { in: [dependencyA.id, dependencyB.id] } } })
    );
    expect(deps.map((d) => d.id)).toEqual([dependencyA.id]);
  });

  it("Scenario : un role scope a l'organisation B ne voit que les scenarios de B", async () => {
    const scenarios = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.scenario.findMany({ where: { id: { in: [scenarioA.id, scenarioB.id] } } })
    );
    expect(scenarios.map((s) => s.id)).toEqual([scenarioB.id]);
  });

  it("Scenario : le role non-proprietaire ne peut pas modifier un scenario hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.scenario.update({ where: { id: scenarioB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Beneficiaire : un role scope a l'organisation A ne voit que les beneficiaires de A", async () => {
    const beneficiaires = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.beneficiaire.findMany({ where: { id: { in: [beneficiaireA.id, beneficiaireB.id] } } })
    );
    expect(beneficiaires.map((b) => b.id)).toEqual([beneficiaireA.id]);
  });

  it("Entity : un role scope a l'organisation B ne voit que les entites de B", async () => {
    const entities = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.entity.findMany({ where: { id: { in: [entityA.id, entityB.id] } } })
    );
    expect(entities.map((e) => e.id)).toEqual([entityB.id]);
  });

  it("Entity : le role non-proprietaire ne peut pas modifier une entite hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.entity.update({ where: { id: entityB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Holiday : un role scope a l'organisation A ne voit que les jours feries de A", async () => {
    const holidays = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.holiday.findMany({ where: { id: { in: [holidayA.id, holidayB.id] } } })
    );
    expect(holidays.map((h) => h.id)).toEqual([holidayA.id]);
  });

  it("Tag : un role scope a l'organisation B ne voit que les tags de B", async () => {
    const tags = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.tag.findMany({ where: { id: { in: [tagA.id, tagB.id] } } })
    );
    expect(tags.map((t) => t.id)).toEqual([tagB.id]);
  });

  it("EntityTag : un role scope a l'organisation A ne voit que les tags d'entite de A", async () => {
    const entityTags = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.entityTag.findMany({ where: { id: { in: [entityTagA.id, entityTagB.id] } } })
    );
    expect(entityTags.map((e) => e.id)).toEqual([entityTagA.id]);
  });

  it("ApiKey : un role scope a l'organisation B ne voit que les cles API de B", async () => {
    const keys = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.apiKey.findMany({ where: { id: { in: [apiKeyA.id, apiKeyB.id] } } })
    );
    expect(keys.map((k) => k.id)).toEqual([apiKeyB.id]);
  });

  it("ApiKey : le role non-proprietaire ne peut pas modifier une cle API hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.apiKey.update({ where: { id: apiKeyB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("PasswordResetToken : un role scope a l'organisation A ne voit que les tokens de A", async () => {
    const tokens = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.passwordResetToken.findMany({ where: { id: { in: [passwordResetTokenA.id, passwordResetTokenB.id] } } })
    );
    expect(tokens.map((t) => t.id)).toEqual([passwordResetTokenA.id]);
  });

  it("PermissionOverride : un role scope a l'organisation B ne voit que les derogations de B", async () => {
    const overrides = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.permissionOverride.findMany({ where: { id: { in: [permissionOverrideA.id, permissionOverrideB.id] } } })
    );
    expect(overrides.map((o) => o.id)).toEqual([permissionOverrideB.id]);
  });

  it("PermissionOverride : le role non-proprietaire ne peut pas modifier une derogation hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.permissionOverride.update({ where: { id: permissionOverrideB.id }, data: { effect: "DENY" } })
      )
    ).rejects.toThrow();
  });

  it("TeamMember : un role scope a l'organisation A ne voit que les membres de A", async () => {
    const members = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.teamMember.findMany({ where: { id: { in: [teamMemberA.id, teamMemberB.id] } } })
    );
    expect(members.map((m) => m.id)).toEqual([teamMemberA.id]);
  });

  it("Stakeholder : un role scope a l'organisation B ne voit que les parties prenantes de B", async () => {
    const stakeholders = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.stakeholder.findMany({ where: { id: { in: [stakeholderA.id, stakeholderB.id] } } })
    );
    expect(stakeholders.map((s) => s.id)).toEqual([stakeholderB.id]);
  });

  it("Stakeholder : le role non-proprietaire ne peut pas modifier une partie prenante hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.stakeholder.update({ where: { id: stakeholderB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("StakeholderProject : un role scope a l'organisation A ne voit que les rattachements de A", async () => {
    const links = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.stakeholderProject.findMany({ where: { id: { in: [stakeholderProjectA.id, stakeholderProjectB.id] } } })
    );
    expect(links.map((l) => l.id)).toEqual([stakeholderProjectA.id]);
  });

  it("StakeholderCommunication : un role scope a l'organisation B ne voit que les communications de B", async () => {
    const comms = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.stakeholderCommunication.findMany({
        where: { id: { in: [stakeholderCommunicationA.id, stakeholderCommunicationB.id] } },
      })
    );
    expect(comms.map((c) => c.id)).toEqual([stakeholderCommunicationB.id]);
  });

  it("UserSession : un role scope a l'organisation A ne voit que les sessions de A", async () => {
    const sessions = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.userSession.findMany({ where: { id: { in: [userSessionA.id, userSessionB.id] } } })
    );
    expect(sessions.map((s) => s.id)).toEqual([userSessionA.id]);
  });
});
