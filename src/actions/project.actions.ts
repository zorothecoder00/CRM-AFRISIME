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
  type CreateProjectInput,
  type CreateSectionInput,
  type AddSectionCommentInput,
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
