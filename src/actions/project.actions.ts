"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  updateProjectDeliverableStatusSchema,
  deleteProjectDeliverableSchema,
  createProjectDecisionSchema,
  createProjectIndicatorSchema,
  createTaskIndicatorSchema,
  createProjectResourceSchema,
  deleteProjectResourceSchema,
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
  type UpdateProjectDeliverableStatusInput,
  type DeleteProjectDeliverableInput,
  type CreateProjectDecisionInput,
  type CreateProjectIndicatorInput,
  type CreateTaskIndicatorInput,
  type CreateProjectResourceInput,
  type DeleteProjectResourceInput,
} from "@/lib/validations/project.schema";
import { createNotification } from "@/lib/notify";

export async function createProject(input: CreateProjectInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = createProjectSchema.parse(input);

  const project = await prisma.project.create({
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
      members: {
        create: [{ userId: data.responsableId, roleOnProject: "CHEF_PROJET" }],
      },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "project.created",
    entityType: "Project",
    entityId: project.id,
    changes: { nom: project.nom },
  });

  revalidatePath("/projets");
  return project;
}

export async function createSection(input: CreateSectionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.SECTION_CREATE);

  const data = createSectionSchema.parse(input);

  const section = await prisma.projectSection.create({
    data: {
      projectId: data.projectId,
      parentId: data.parentId || undefined,
      type: data.type,
      nom: data.nom,
      responsableId: data.responsableId || undefined,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
    },
  });

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

  const section = await prisma.projectSection.findUniqueOrThrow({
    where: { id: data.sectionId },
    select: { projectId: true },
  });

  const comment = await prisma.sectionComment.create({
    data: { sectionId: data.sectionId, content: data.content, authorId: session.user.id },
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

  const project = await prisma.project.update({
    where: { id: data.projectId },
    data: { coutReel: Number(data.coutReel) },
  });

  await logAudit({
    userId: session.user.id,
    action: "project.cout_reel_updated",
    entityType: "Project",
    entityId: project.id,
    changes: { coutReel: data.coutReel },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return project;
}

/** Changement de statut depuis la vue Kanban (cahier des charges §VI) — meme principe que updateTaskStatus. */
export async function updateProjectStatus(projectId: string, statut: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectStatusSchema.parse({ projectId, statut });

  const project = await prisma.project.update({
    where: { id: data.projectId },
    data: { statut: data.statut },
  });

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
  return project;
}

export async function updateProjectSponsor(input: UpdateProjectSponsorInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectSponsorSchema.parse(input);

  const project = await prisma.project.update({
    where: { id: data.projectId },
    data: { sponsorId: data.sponsorId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: "project.sponsor_updated",
    entityType: "Project",
    entityId: project.id,
    changes: { sponsorId: data.sponsorId ?? null },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return project;
}

export async function updateProjectLocation(input: UpdateProjectLocationInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectLocationSchema.parse(input);

  const project = await prisma.project.update({
    where: { id: data.projectId },
    data: {
      localisation: data.localisation || null,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "project.location_updated",
    entityType: "Project",
    entityId: project.id,
    changes: { localisation: data.localisation ?? null, latitude: data.latitude ?? null, longitude: data.longitude ?? null },
  });

  revalidatePath(`/projets/${data.projectId}`);
  revalidatePath("/projets/carte");
  return project;
}

// ---- Risques (cahier des charges §VI) ----

export async function createProjectRisk(input: CreateProjectRiskInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectRiskSchema.parse(input);

  const risk = await prisma.projectRisk.create({
    data: {
      projectId: data.projectId,
      titre: data.titre,
      description: data.description,
      probabilite: data.probabilite,
      impact: data.impact,
      planMitigation: data.planMitigation,
      responsableId: data.responsableId || undefined,
      createdById: session.user.id,
    },
  });

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

  const risk = await prisma.projectRisk.update({
    where: { id: data.riskId },
    data: { statut: data.statut },
  });

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

  const risk = await prisma.projectRisk.delete({ where: { id: data.riskId } });

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

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId: data.projectId,
      nom: data.nom,
      description: data.description,
      dateCible: new Date(data.dateCible),
    },
  });

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

  const milestone = await prisma.projectMilestone.update({
    where: { id: data.milestoneId },
    data: { statut: data.statut },
  });

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

  const milestone = await prisma.projectMilestone.delete({ where: { id: data.milestoneId } });

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

  const deliverable = await prisma.projectDeliverable.create({
    data: {
      projectId: data.projectId,
      nom: data.nom,
      description: data.description,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      responsableId: data.responsableId || undefined,
      createdById: session.user.id,
    },
  });

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

export async function updateProjectDeliverableStatus(input: UpdateProjectDeliverableStatusInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectDeliverableStatusSchema.parse(input);

  const deliverable = await prisma.projectDeliverable.update({
    where: { id: data.deliverableId },
    data: { statut: data.statut },
  });

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

  const deliverable = await prisma.projectDeliverable.delete({ where: { id: data.deliverableId } });

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

// ---- Décisions (cahier des charges §VI/§X) ----

/** Décision prise directement au niveau projet, sans réunion. Même principe que addDecision (meeting.actions.ts) : crée une tâche automatiquement. */
export async function createProjectDecision(input: CreateProjectDecisionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectDecisionSchema.parse(input);

  const task = await prisma.task.create({
    data: {
      projectId: data.projectId,
      titre: data.description,
      statut: "A_FAIRE",
      priorite: "MOYENNE",
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      responsablePrincipalId: data.responsableId,
      createdById: session.user.id,
      creeParWorkflow: true,
    },
  });

  const decision = await prisma.meetingDecision.create({
    data: {
      projectId: data.projectId,
      description: data.description,
      motif: data.motif || undefined,
      responsableId: data.responsableId,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      taskId: task.id,
    },
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

  const indicator = await prisma.indicator.create({
    data: { projectId: data.projectId, nom: data.nom, unite: data.unite, valeurCible: Number(data.valeurCible) },
  });

  await logAudit({
    userId: session.user.id,
    action: "indicator.created",
    entityType: "Project",
    entityId: data.projectId,
    changes: { nom: indicator.nom },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return indicator;
}

export async function createTaskIndicator(input: CreateTaskIndicatorInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = createTaskIndicatorSchema.parse(input);

  const indicator = await prisma.indicator.create({
    data: { taskId: data.taskId, nom: data.nom, unite: data.unite, valeurCible: Number(data.valeurCible) },
  });

  await logAudit({
    userId: session.user.id,
    action: "indicator.created",
    entityType: "Task",
    entityId: data.taskId,
    changes: { nom: indicator.nom },
  });

  revalidatePath(`/taches/${data.taskId}`);
  return indicator;
}

// ---- Ressources (cahier des charges §VI) ----

export async function createProjectResource(input: CreateProjectResourceInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectResourceSchema.parse(input);

  const resource = await prisma.projectResource.create({
    data: {
      projectId: data.projectId,
      nom: data.nom,
      type: data.type || undefined,
      quantite: data.quantite ? Number(data.quantite) : undefined,
      unite: data.unite || undefined,
      coutUnitaire: data.coutUnitaire ? Number(data.coutUnitaire) : undefined,
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "project.resource_created",
    entityType: "ProjectResource",
    entityId: resource.id,
    changes: { nom: resource.nom, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return resource;
}

export async function deleteProjectResource(input: DeleteProjectResourceInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectResourceSchema.parse(input);

  const resource = await prisma.projectResource.delete({ where: { id: data.resourceId } });

  await logAudit({
    userId: session.user.id,
    action: "project.resource_deleted",
    entityType: "ProjectResource",
    entityId: resource.id,
    changes: { nom: resource.nom },
  });

  revalidatePath(`/projets/${resource.projectId}`);
  return resource;
}
