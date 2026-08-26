"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { runProjectStatusChangedRules, runProjectRiskCreatedRules, runMeetingDecisionCreatedRules } from "@/lib/automation";
import {
  createProjectSchema,
  createSectionSchema,
  addSectionCommentSchema,
  updateProjectCoutReelSchema,
  updateProjectStatusSchema,
  updateProjectSponsorSchema,
  updateProjectLocationSchema,
  createProjectRiskSchema,
  updateProjectRiskStatusSchema,
  deleteProjectRiskSchema,
  createProjectMilestoneSchema,
  updateProjectMilestoneStatusSchema,
  deleteProjectMilestoneSchema,
  createProjectDeliverableSchema,
  updateProjectDeliverableSchema,
  updateProjectDeliverableStatusSchema,
  deleteProjectDeliverableSchema,
  createProjectFeedbackSchema,
  updateProjectFeedbackStatusSchema,
  deleteProjectFeedbackSchema,
  createProjectDecisionSchema,
  createProjectIndicatorSchema,
  createTaskIndicatorSchema,
  createProjectResourceSchema,
  deleteProjectResourceSchema,
  convertSectionSchema,
  updateProjectScopeSchema,
  type CreateProjectInput,
  type CreateSectionInput,
  type AddSectionCommentInput,
  type UpdateProjectCoutReelInput,
  type UpdateProjectSponsorInput,
  type UpdateProjectLocationInput,
  type CreateProjectRiskInput,
  type UpdateProjectRiskStatusInput,
  type DeleteProjectRiskInput,
  type CreateProjectMilestoneInput,
  type UpdateProjectMilestoneStatusInput,
  type DeleteProjectMilestoneInput,
  type CreateProjectDeliverableInput,
  type UpdateProjectDeliverableInput,
  type UpdateProjectDeliverableStatusInput,
  type DeleteProjectDeliverableInput,
  type CreateProjectFeedbackInput,
  type UpdateProjectFeedbackStatusInput,
  type DeleteProjectFeedbackInput,
  type CreateProjectDecisionInput,
  type CreateProjectIndicatorInput,
  type CreateTaskIndicatorInput,
  type CreateProjectResourceInput,
  type DeleteProjectResourceInput,
  type ConvertSectionInput,
  type UpdateProjectScopeInput,
} from "@/lib/validations/project.schema";
import { createNotification } from "@/lib/notify";

export async function createProject(input: CreateProjectInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = createProjectSchema.parse(input);

  const project = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.project.create({
      data: {
        nom: data.nom,
        description: data.description,
        objectif: data.objectif,
        responsableId: data.responsableId,
        departmentId: data.departmentId,
        priorite: data.priorite,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
        budget: data.budget ? Number(data.budget) : undefined,
        localisation: data.localisation,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
        members: {
          create: [{ userId: data.responsableId, roleOnProject: "CHEF_PROJET", organizationId: session.user.organizationId }],
        },
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.created",
    entityType: "Project",
    entityId: project.id,
    changes: { nom: project.nom },
  });

  revalidatePath("/projets");
  return { ...project, budget: project.budget ? Number(project.budget) : null, coutReel: project.coutReel ? Number(project.coutReel) : null };
}

export async function createSection(input: CreateSectionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.SECTION_CREATE);

  const data = createSectionSchema.parse(input);

  const section = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectSection.create({
      data: {
        projectId: data.projectId,
        parentId: data.parentId || undefined,
        type: data.type,
        nom: data.nom,
        responsableId: data.responsableId || undefined,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "section.created",
    entityType: "ProjectSection",
    entityId: section.id,
    changes: { nom: section.nom, type: section.type, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return section;
}

/** Commentaire sur une section — miroir de addComment pour les tâches (cahier des charges §5). */
export async function addSectionComment(input: AddSectionCommentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.TASK_COMMENT);

  const data = addSectionCommentSchema.parse(input);

  const { section, comment } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const section = await tx.projectSection.findUniqueOrThrow({
      where: { id: data.sectionId },
      select: { projectId: true },
    });

    const comment = await tx.sectionComment.create({
      data: {
        sectionId: data.sectionId,
        content: data.content,
        authorId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    return { section, comment };
  });

  await logAudit({
    userId: session.user.id,
    action: "section.comment_added",
    entityType: "ProjectSection",
    entityId: data.sectionId,
    changes: { commentId: comment.id },
  });

  revalidatePath(`/projets/${section.projectId}/sections/${data.sectionId}`);
  return comment;
}

export async function updateProjectCoutReel(input: UpdateProjectCoutReelInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectCoutReelSchema.parse(input);

  const project = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.project.update({
      where: { id: data.projectId },
      data: { coutReel: Number(data.coutReel) },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.cout_reel_updated",
    entityType: "Project",
    entityId: project.id,
    changes: { coutReel: data.coutReel },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return { ...project, budget: project.budget ? Number(project.budget) : null, coutReel: project.coutReel ? Number(project.coutReel) : null };
}

/** Changement de statut depuis la vue Kanban (cahier des charges §VI) — meme principe que updateTaskStatus. */
export async function updateProjectStatus(projectId: string, statut: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectStatusSchema.parse({ projectId, statut });

  const project = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.project.update({
      where: { id: data.projectId },
      data: { statut: data.statut },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.status_changed",
    entityType: "Project",
    entityId: project.id,
    changes: { statut: data.statut },
  });

  await runProjectStatusChangedRules({
    id: project.id,
    nom: project.nom,
    responsableId: project.responsableId,
    statut: project.statut,
  });

  revalidatePath("/projets");
  revalidatePath(`/projets/${data.projectId}`);
  return { ...project, budget: project.budget ? Number(project.budget) : null, coutReel: project.coutReel ? Number(project.coutReel) : null };
}

export async function updateProjectSponsor(input: UpdateProjectSponsorInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectSponsorSchema.parse(input);

  const project = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.project.update({
      where: { id: data.projectId },
      data: { sponsorId: data.sponsorId || null },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.sponsor_updated",
    entityType: "Project",
    entityId: project.id,
    changes: { sponsorId: data.sponsorId ?? null },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return { ...project, budget: project.budget ? Number(project.budget) : null, coutReel: project.coutReel ? Number(project.coutReel) : null };
}

export async function updateProjectLocation(input: UpdateProjectLocationInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectLocationSchema.parse(input);

  const project = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.project.update({
      where: { id: data.projectId },
      data: {
        localisation: data.localisation || null,
        pays: data.pays || null,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.location_updated",
    entityType: "Project",
    entityId: project.id,
    changes: {
      localisation: data.localisation ?? null,
      pays: data.pays ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    },
  });

  revalidatePath(`/projets/${data.projectId}`);
  revalidatePath("/projets/carte");
  return { ...project, budget: project.budget ? Number(project.budget) : null, coutReel: project.coutReel ? Number(project.coutReel) : null };
}

// ---- Risques (cahier des charges §VI) ----

export async function createProjectRisk(input: CreateProjectRiskInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectRiskSchema.parse(input);

  const risk = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectRisk.create({
      data: {
        projectId: data.projectId,
        titre: data.titre,
        description: data.description,
        probabilite: data.probabilite,
        impact: data.impact,
        categorie: data.categorie,
        planMitigation: data.planMitigation,
        planContingence: data.planContingence,
        responsableId: data.responsableId || undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.risk_created",
    entityType: "ProjectRisk",
    entityId: risk.id,
    changes: { titre: risk.titre, projectId: data.projectId },
  });

  await runProjectRiskCreatedRules({
    id: risk.id,
    titre: risk.titre,
    projectId: risk.projectId,
    responsableId: risk.responsableId,
    probabilite: risk.probabilite,
    impact: risk.impact,
  });

  revalidatePath(`/projets/${data.projectId}`);
  return risk;
}

export async function updateProjectRiskStatus(input: UpdateProjectRiskStatusInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectRiskStatusSchema.parse(input);

  const risk = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectRisk.update({
      where: { id: data.riskId },
      data: { statut: data.statut },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.risk_status_updated",
    entityType: "ProjectRisk",
    entityId: risk.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/projets/${risk.projectId}`);
  return risk;
}

export async function deleteProjectRisk(input: DeleteProjectRiskInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectRiskSchema.parse(input);

  const risk = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectRisk.delete({ where: { id: data.riskId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.risk_deleted",
    entityType: "ProjectRisk",
    entityId: risk.id,
    changes: { titre: risk.titre },
  });

  revalidatePath(`/projets/${risk.projectId}`);
  return risk;
}

// ---- Jalons (cahier des charges §VI) ----

export async function createProjectMilestone(input: CreateProjectMilestoneInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectMilestoneSchema.parse(input);

  const milestone = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectMilestone.create({
      data: {
        projectId: data.projectId,
        nom: data.nom,
        description: data.description,
        dateCible: new Date(data.dateCible),
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.milestone_created",
    entityType: "ProjectMilestone",
    entityId: milestone.id,
    changes: { nom: milestone.nom, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return milestone;
}

export async function updateProjectMilestoneStatus(input: UpdateProjectMilestoneStatusInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectMilestoneStatusSchema.parse(input);

  // Project Studio §44 — passage a ATTEINT horodate automatiquement la date
  // reelle (si non fournie) et la validation (qui/quand), sans etape separee.
  const milestone = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectMilestone.update({
      where: { id: data.milestoneId },
      data: {
        statut: data.statut,
        ...(data.statut === "ATTEINT"
          ? {
              dateReelle: data.dateReelle ? new Date(data.dateReelle) : new Date(),
              valideParId: session.user.id,
              valideLe: new Date(),
            }
          : {}),
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.milestone_status_updated",
    entityType: "ProjectMilestone",
    entityId: milestone.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/projets/${milestone.projectId}`);
  return milestone;
}

export async function deleteProjectMilestone(input: DeleteProjectMilestoneInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectMilestoneSchema.parse(input);

  const milestone = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectMilestone.delete({ where: { id: data.milestoneId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.milestone_deleted",
    entityType: "ProjectMilestone",
    entityId: milestone.id,
    changes: { nom: milestone.nom },
  });

  revalidatePath(`/projets/${milestone.projectId}`);
  return milestone;
}

// ---- Livrables (cahier des charges §VI) ----

export async function createProjectDeliverable(input: CreateProjectDeliverableInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectDeliverableSchema.parse(input);

  const deliverable = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDeliverable.create({
      data: {
        projectId: data.projectId,
        nom: data.nom,
        description: data.description,
        echeance: data.echeance ? new Date(data.echeance) : undefined,
        responsableId: data.responsableId || undefined,
        objectiveId: data.objectiveId || undefined,
        criteresAcceptation: data.criteresAcceptation || undefined,
        version: data.version || undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.deliverable_created",
    entityType: "ProjectDeliverable",
    entityId: deliverable.id,
    changes: { nom: deliverable.nom, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return deliverable;
}

export async function updateProjectDeliverable(input: UpdateProjectDeliverableInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectDeliverableSchema.parse(input);

  const deliverable = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDeliverable.update({
      where: { id: data.deliverableId },
      data: {
        nom: data.nom,
        description: data.description,
        echeance: data.echeance ? new Date(data.echeance) : null,
        responsableId: data.responsableId || null,
        criteresAcceptation: data.criteresAcceptation,
        version: data.version,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.deliverable_updated",
    entityType: "ProjectDeliverable",
    entityId: deliverable.id,
    changes: { nom: deliverable.nom, version: deliverable.version },
  });

  revalidatePath(`/projets/${deliverable.projectId}`);
  return deliverable;
}

export async function updateProjectDeliverableStatus(input: UpdateProjectDeliverableStatusInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectDeliverableStatusSchema.parse(input);

  // Project Studio §45 — passage a VALIDE horodate automatiquement la
  // validation (qui/quand), sans etape separee.
  const deliverable = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDeliverable.update({
      where: { id: data.deliverableId },
      data: {
        statut: data.statut,
        ...(data.statut === "VALIDE" ? { valideParId: session.user.id, valideLe: new Date() } : {}),
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.deliverable_status_updated",
    entityType: "ProjectDeliverable",
    entityId: deliverable.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/projets/${deliverable.projectId}`);
  return deliverable;
}

export async function deleteProjectDeliverable(input: DeleteProjectDeliverableInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectDeliverableSchema.parse(input);

  const deliverable = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDeliverable.delete({ where: { id: data.deliverableId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.deliverable_deleted",
    entityType: "ProjectDeliverable",
    entityId: deliverable.id,
    changes: { nom: deliverable.nom },
  });

  revalidatePath(`/projets/${deliverable.projectId}`);
  return deliverable;
}

// ---- Retours bénéficiaires/utilisateurs (Project Studio §46) ----

export async function createProjectFeedback(input: CreateProjectFeedbackInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectFeedbackSchema.parse(input);

  const feedback = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectFeedback.create({
      data: {
        projectId: data.projectId,
        type: data.type,
        contenu: data.contenu,
        note: data.note,
        auteurNom: data.auteurNom || undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.feedback_created",
    entityType: "ProjectFeedback",
    entityId: feedback.id,
    changes: { type: feedback.type, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return feedback;
}

export async function updateProjectFeedbackStatus(input: UpdateProjectFeedbackStatusInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectFeedbackStatusSchema.parse(input);

  const feedback = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectFeedback.update({
      where: { id: data.feedbackId },
      data: { statut: data.statut, reponse: data.reponse },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.feedback_status_updated",
    entityType: "ProjectFeedback",
    entityId: feedback.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/projets/${feedback.projectId}`);
  return feedback;
}

export async function deleteProjectFeedback(input: DeleteProjectFeedbackInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectFeedbackSchema.parse(input);

  const feedback = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectFeedback.delete({ where: { id: data.feedbackId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.feedback_deleted",
    entityType: "ProjectFeedback",
    entityId: feedback.id,
    changes: { type: feedback.type },
  });

  revalidatePath(`/projets/${feedback.projectId}`);
  return feedback;
}

// ---- Décisions (cahier des charges §VI/§X) ----

/** Décision prise directement au niveau projet, sans réunion. Même principe que addDecision (meeting.actions.ts) : crée une tâche automatiquement. */
export async function createProjectDecision(input: CreateProjectDecisionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectDecisionSchema.parse(input);

  const { task, decision } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const task = await tx.task.create({
      data: {
        projectId: data.projectId,
        titre: data.description,
        statut: "A_FAIRE",
        priorite: "MOYENNE",
        echeance: data.echeance ? new Date(data.echeance) : undefined,
        responsablePrincipalId: data.responsableId,
        createdById: session.user.id,
        creeParWorkflow: true,
        organizationId: session.user.organizationId,
      },
    });

    const decision = await tx.meetingDecision.create({
      data: {
        projectId: data.projectId,
        description: data.description,
        motif: data.motif || undefined,
        impact: data.impact || undefined,
        responsableId: data.responsableId,
        echeance: data.echeance ? new Date(data.echeance) : undefined,
        taskId: task.id,
        organizationId: session.user.organizationId,
      },
    });

    return { task, decision };
  });

  await logAudit({
    userId: session.user.id,
    action: "project.decision_created",
    entityType: "MeetingDecision",
    entityId: decision.id,
    changes: { description: data.description, projectId: data.projectId },
  });

  await runMeetingDecisionCreatedRules({
    id: decision.id,
    description: decision.description,
    projectId: decision.projectId,
    responsableId: decision.responsableId,
  });

  if (data.responsableId !== session.user.id) {
    await createNotification({
      userId: data.responsableId,
      type: "NOUVELLE_TACHE",
      titre: `Nouvelle tâche assignée : ${task.titre}`,
      lien: `/taches/${task.id}`,
      entityType: "Task",
      entityId: task.id,
    });
  }

  revalidatePath(`/projets/${data.projectId}`);
  return decision;
}

// ---- KPI / Indicateurs (cahier des charges §VI/§IX) ----

export async function createProjectIndicator(input: CreateProjectIndicatorInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectIndicatorSchema.parse(input);

  const indicator = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.indicator.create({
      data: {
        projectId: data.projectId,
        nom: data.nom,
        unite: data.unite,
        valeurCible: Number(data.valeurCible),
        definition: data.definition || undefined,
        formule: data.formule || undefined,
        baseline: data.baseline ? Number(data.baseline) : undefined,
        source: data.source || undefined,
        frequence: data.frequence,
        responsableId: data.responsableId || undefined,
        desagregation: data.desagregation || undefined,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "indicator.created",
    entityType: "Project",
    entityId: data.projectId,
    changes: { nom: indicator.nom },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return {
    ...indicator,
    valeurCible: Number(indicator.valeurCible),
    valeurActuelle: Number(indicator.valeurActuelle),
    baseline: indicator.baseline !== null ? Number(indicator.baseline) : null,
  };
}

export async function createTaskIndicator(input: CreateTaskIndicatorInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = createTaskIndicatorSchema.parse(input);

  const indicator = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.indicator.create({
      data: {
        taskId: data.taskId,
        nom: data.nom,
        unite: data.unite,
        valeurCible: Number(data.valeurCible),
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "indicator.created",
    entityType: "Task",
    entityId: data.taskId,
    changes: { nom: indicator.nom },
  });

  revalidatePath(`/taches/${data.taskId}`);
  return { ...indicator, valeurCible: Number(indicator.valeurCible), valeurActuelle: Number(indicator.valeurActuelle) };
}

// ---- Ressources (cahier des charges §VI) ----

export async function createProjectResource(input: CreateProjectResourceInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectResourceSchema.parse(input);

  const resource = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectResource.create({
      data: {
        projectId: data.projectId,
        nom: data.nom,
        type: data.type || undefined,
        quantite: data.quantite ? Number(data.quantite) : undefined,
        unite: data.unite || undefined,
        coutUnitaire: data.coutUnitaire ? Number(data.coutUnitaire) : undefined,
        notes: data.notes || undefined,
        taskId: data.taskId || undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.resource_created",
    entityType: "ProjectResource",
    entityId: resource.id,
    changes: { nom: resource.nom, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return { ...resource, quantite: resource.quantite ? Number(resource.quantite) : null, coutUnitaire: resource.coutUnitaire ? Number(resource.coutUnitaire) : null };
}

export async function deleteProjectResource(input: DeleteProjectResourceInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectResourceSchema.parse(input);

  const resource = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectResource.delete({ where: { id: data.resourceId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.resource_deleted",
    entityType: "ProjectResource",
    entityId: resource.id,
    changes: { nom: resource.nom },
  });

  revalidatePath(`/projets/${resource.projectId}`);
  return { ...resource, quantite: resource.quantite ? Number(resource.quantite) : null, coutUnitaire: resource.coutUnitaire ? Number(resource.coutUnitaire) : null };
}

// ---- WBS (Project Studio §15) ----

/** Convertit un noeud du WBS (ProjectSection) en livrable. */
export async function convertSectionToDeliverable(input: ConvertSectionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = convertSectionSchema.parse(input);

  const deliverable = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const section = await tx.projectSection.findUniqueOrThrow({ where: { id: data.sectionId } });
    return tx.projectDeliverable.create({
      data: {
        projectId: section.projectId,
        sectionId: section.id,
        nom: section.nom,
        description: section.description,
        echeance: section.dateFin ?? undefined,
        responsableId: section.responsableId ?? undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "section.converted_to_deliverable",
    entityType: "ProjectDeliverable",
    entityId: deliverable.id,
    changes: { sectionId: data.sectionId },
  });

  revalidatePath(`/projets/${deliverable.projectId}`);
  return deliverable;
}

/** Convertit un noeud du WBS (ProjectSection) en jalon. */
export async function convertSectionToMilestone(input: ConvertSectionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = convertSectionSchema.parse(input);

  const milestone = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const section = await tx.projectSection.findUniqueOrThrow({ where: { id: data.sectionId } });
    if (!section.dateFin) {
      throw new Error("Cette section n'a pas de date de fin — impossible d'en déduire la date cible du jalon.");
    }
    return tx.projectMilestone.create({
      data: {
        projectId: section.projectId,
        sectionId: section.id,
        nom: section.nom,
        description: section.description,
        dateCible: section.dateFin,
      },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "section.converted_to_milestone",
    entityType: "ProjectMilestone",
    entityId: milestone.id,
    changes: { sectionId: data.sectionId },
  });

  revalidatePath(`/projets/${milestone.projectId}`);
  return milestone;
}

// ---- Scope Management (Project Studio §17) / Project Charter (§16) ----

export async function updateProjectScope(input: UpdateProjectScopeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectScopeSchema.parse(input);

  const project = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.project.update({
      where: { id: data.projectId },
      data: {
        perimetreInclus: data.perimetreInclus || null,
        perimetreExclus: data.perimetreExclus || null,
        contraintes: data.contraintes || null,
        limites: data.limites || null,
        criteresReussite: data.criteresReussite || null,
        gouvernance: data.gouvernance || null,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project.scope_updated",
    entityType: "Project",
    entityId: project.id,
    changes: {},
  });

  revalidatePath(`/projets/${project.id}`);
  return { ...project, budget: project.budget ? Number(project.budget) : null, coutReel: project.coutReel ? Number(project.coutReel) : null };
}
