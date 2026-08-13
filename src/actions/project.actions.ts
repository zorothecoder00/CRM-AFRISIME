"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
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
  createProjectStakeholderSchema,
  deleteProjectStakeholderSchema,
  createProjectMilestoneSchema,
  updateProjectMilestoneStatusSchema,
  deleteProjectMilestoneSchema,
  createProjectDeliverableSchema,
  updateProjectDeliverableStatusSchema,
  deleteProjectDeliverableSchema,
  type CreateProjectInput,
  type CreateSectionInput,
  type AddSectionCommentInput,
  type UpdateProjectCoutReelInput,
  type UpdateProjectSponsorInput,
  type UpdateProjectLocationInput,
  type CreateProjectRiskInput,
  type UpdateProjectRiskStatusInput,
  type DeleteProjectRiskInput,
  type CreateProjectStakeholderInput,
  type DeleteProjectStakeholderInput,
  type CreateProjectMilestoneInput,
  type UpdateProjectMilestoneStatusInput,
  type DeleteProjectMilestoneInput,
  type CreateProjectDeliverableInput,
  type UpdateProjectDeliverableStatusInput,
  type DeleteProjectDeliverableInput,
} from "@/lib/validations/project.schema";

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

// ---- Parties prenantes (cahier des charges §VI) ----

export async function createProjectStakeholder(input: CreateProjectStakeholderInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectStakeholderSchema.parse(input);

  const stakeholder = await prisma.projectStakeholder.create({
    data: {
      projectId: data.projectId,
      nom: data.nom,
      role: data.role,
      userId: data.userId || undefined,
      contactId: data.contactId || undefined,
      influence: data.influence,
      interet: data.interet,
      notes: data.notes,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "project.stakeholder_created",
    entityType: "ProjectStakeholder",
    entityId: stakeholder.id,
    changes: { nom: stakeholder.nom, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return stakeholder;
}

export async function deleteProjectStakeholder(input: DeleteProjectStakeholderInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectStakeholderSchema.parse(input);

  const stakeholder = await prisma.projectStakeholder.delete({ where: { id: data.stakeholderId } });

  await logAudit({
    userId: session.user.id,
    action: "project.stakeholder_deleted",
    entityType: "ProjectStakeholder",
    entityId: stakeholder.id,
    changes: { nom: stakeholder.nom },
  });

  revalidatePath(`/projets/${stakeholder.projectId}`);
  return stakeholder;
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
