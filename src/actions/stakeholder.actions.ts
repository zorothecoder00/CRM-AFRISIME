"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createStakeholderSchema,
  updateStakeholderSchema,
  deleteStakeholderSchema,
  linkStakeholderToProjectSchema,
  unlinkStakeholderFromProjectSchema,
  createStakeholderCommunicationSchema,
  type CreateStakeholderInput,
  type UpdateStakeholderInput,
  type DeleteStakeholderInput,
  type LinkStakeholderToProjectInput,
  type UnlinkStakeholderFromProjectInput,
  type CreateStakeholderCommunicationInput,
} from "@/lib/validations/stakeholder.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Crée un profil partie prenante (cahier des charges V2.2 §21), avec liaison optionnelle immédiate à un projet. */
export async function createStakeholder(input: CreateStakeholderInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);
  const data = createStakeholderSchema.parse(input);

  const stakeholder = await prisma.stakeholder.create({
    data: {
      nom: data.nom,
      userId: data.userId || undefined,
      contactId: data.contactId || undefined,
      influence: data.influence,
      interet: data.interet,
      niveauEngagement: data.niveauEngagement,
      position: data.position || undefined,
      relation: data.relation || undefined,
      categorie: data.categorie || undefined,
      organisation: data.organisation || undefined,
      attentes: data.attentes || undefined,
      strategieEngagement: data.strategieEngagement || undefined,
      responsableId: data.responsableId || undefined,
      risquesRelationnels: data.risquesRelationnels || undefined,
      notes: data.notes || undefined,
      createdById: session.user.id,
      ...(data.projectId
        ? { projects: { create: [{ projectId: data.projectId, role: data.role || undefined }] } }
        : {}),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "stakeholder.created",
    entityType: "Stakeholder",
    entityId: stakeholder.id,
    changes: { nom: stakeholder.nom, projectId: data.projectId },
  });

  revalidatePath("/parties-prenantes");
  if (data.projectId) revalidatePath(`/projets/${data.projectId}`);
  return { id: stakeholder.id };
}

export async function updateStakeholder(input: UpdateStakeholderInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);
  const data = updateStakeholderSchema.parse(input);

  const stakeholder = await prisma.stakeholder.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      userId: data.userId || null,
      contactId: data.contactId || null,
      influence: data.influence,
      interet: data.interet,
      niveauEngagement: data.niveauEngagement,
      position: data.position || null,
      relation: data.relation || null,
      categorie: data.categorie || null,
      organisation: data.organisation || null,
      attentes: data.attentes || null,
      strategieEngagement: data.strategieEngagement || null,
      responsableId: data.responsableId || null,
      risquesRelationnels: data.risquesRelationnels || null,
      notes: data.notes || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "stakeholder.updated",
    entityType: "Stakeholder",
    entityId: stakeholder.id,
    changes: { nom: stakeholder.nom },
  });

  revalidatePath("/parties-prenantes");
  revalidatePath(`/parties-prenantes/${stakeholder.id}`);
  return { id: stakeholder.id };
}

export async function deleteStakeholder(input: DeleteStakeholderInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);
  const data = deleteStakeholderSchema.parse(input);

  await prisma.stakeholder.delete({ where: { id: data.id } });

  await logAudit({
    userId: session.user.id,
    action: "stakeholder.deleted",
    entityType: "Stakeholder",
    entityId: data.id,
    changes: {},
  });

  revalidatePath("/parties-prenantes");
}

/** Lie une partie prenante existante à un projet supplémentaire ("projets associés", V2.2 §21). */
export async function linkStakeholderToProject(input: LinkStakeholderToProjectInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);
  const data = linkStakeholderToProjectSchema.parse(input);

  const link = await prisma.stakeholderProject.upsert({
    where: { stakeholderId_projectId: { stakeholderId: data.stakeholderId, projectId: data.projectId } },
    update: { role: data.role || undefined },
    create: { stakeholderId: data.stakeholderId, projectId: data.projectId, role: data.role || undefined },
  });

  await logAudit({
    userId: session.user.id,
    action: "stakeholder.linked_to_project",
    entityType: "Stakeholder",
    entityId: data.stakeholderId,
    changes: { projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  revalidatePath(`/parties-prenantes/${data.stakeholderId}`);
  return { id: link.id };
}

export async function unlinkStakeholderFromProject(input: UnlinkStakeholderFromProjectInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);
  const data = unlinkStakeholderFromProjectSchema.parse(input);

  const link = await prisma.stakeholderProject.delete({ where: { id: data.stakeholderProjectId } });

  await logAudit({
    userId: session.user.id,
    action: "stakeholder.unlinked_from_project",
    entityType: "Stakeholder",
    entityId: link.stakeholderId,
    changes: { projectId: link.projectId },
  });

  revalidatePath(`/projets/${link.projectId}`);
  revalidatePath(`/parties-prenantes/${link.stakeholderId}`);
}

/** Fil de communications (cahier des charges V2.2 §21). */
export async function createStakeholderCommunication(input: CreateStakeholderCommunicationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);
  const data = createStakeholderCommunicationSchema.parse(input);

  const communication = await prisma.stakeholderCommunication.create({
    data: {
      stakeholderId: data.stakeholderId,
      date: new Date(data.date),
      canal: data.canal || undefined,
      resume: data.resume,
      authorId: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "stakeholder.communication_logged",
    entityType: "Stakeholder",
    entityId: data.stakeholderId,
    changes: { resume: data.resume },
  });

  revalidatePath(`/parties-prenantes/${data.stakeholderId}`);
  return { id: communication.id };
}
