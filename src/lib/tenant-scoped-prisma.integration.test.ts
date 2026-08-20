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
      data: { prenom: "Contact", nom: "A", createdById: userA.id },
    });
    crmContactB = await admin.crmContact.create({
      data: { prenom: "Contact", nom: "B", createdById: userB.id },
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
  });

  afterAll(async () => {
    // Nettoyage via le role admin (le role restreint ne peut de toute facon
    // pas voir/supprimer les lignes hors de son organisation). Ordre inverse
    // des FK : les modeles "feuilles" (lots 7-9) d'abord, puis Meeting/
    // DocumentFolder/Document/Task/ProjectSection/Whiteboard/ProjectMember/
    // ProjectRisk/ProjectMilestone/ProjectDeliverable/ProjectResource
    // referencent Project+User, Project/Team referencent User+Department,
    // qui referencent PlatformOrganization.
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
});
