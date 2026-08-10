"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { createNotification, notifyMany } from "@/lib/notify";
import { parseMentions } from "@/lib/mentions";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  addCommentSchema,
  addChecklistItemSchema,
  addDependencySchema,
  updateActualTimeSchema,
  type CreateTaskInput,
} from "@/lib/validations/task.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createTask(input: CreateTaskInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_CREATE);

  const data = createTaskSchema.parse(input);

  const task = await prisma.task.create({
    data: {
      projectId: data.projectId,
      sectionId: data.sectionId || undefined,
      titre: data.titre,
      description: data.description,
      priorite: data.priorite,
      responsablePrincipalId: data.responsablePrincipalId,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      tempsEstimeHeures: data.tempsEstimeHeures ? Number(data.tempsEstimeHeures) : undefined,
      createdById: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "task.created",
      entityType: "Task",
      entityId: task.id,
    },
  });

  if (task.responsablePrincipalId !== session.user.id) {
    await createNotification({
      userId: task.responsablePrincipalId,
      type: "NOUVELLE_TACHE",
      titre: `Nouvelle tâche assignée : ${task.titre}`,
      lien: `/taches/${task.id}`,
      entityType: "Task",
      entityId: task.id,
    });
  }

  revalidatePath("/taches");
  revalidatePath(`/projets/${data.projectId}`);
  return task;
}

export async function updateTaskStatus(taskId: string, statut: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = updateTaskStatusSchema.parse({ taskId, statut });

  const task = await prisma.task.update({
    where: { id: data.taskId },
    data: { statut: data.statut, avancement: data.statut === "TERMINEE" ? 100 : undefined },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "task.status_changed",
      entityType: "Task",
      entityId: task.id,
      changes: { statut: data.statut },
    },
  });

  revalidatePath("/taches");
  revalidatePath(`/taches/${taskId}`);
  return task;
}

export async function addComment(taskId: string, content: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_COMMENT);

  const data = addCommentSchema.parse({ taskId, content });

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: data.taskId },
    include: {
      responsablePrincipal: true,
      assignees: { include: { user: true } },
      project: { include: { members: { include: { user: true } } } },
    },
  });

  const comment = await prisma.taskComment.create({
    data: { taskId: data.taskId, content: data.content, authorId: session.user.id },
  });

  const participantIds = [task.responsablePrincipalId, ...task.assignees.map((a) => a.userId)];
  await notifyMany(participantIds, session.user.id, {
    type: "COMMENTAIRE",
    titre: `Nouveau commentaire sur : ${task.titre}`,
    lien: `/taches/${taskId}`,
    entityType: "TaskComment",
    entityId: comment.id,
  });

  const candidates = [
    { id: task.responsablePrincipalId, name: task.responsablePrincipal.name },
    ...task.assignees.map((a) => ({ id: a.userId, name: a.user.name })),
    ...task.project.members.map((m) => ({ id: m.userId, name: m.user.name })),
  ];
  const mentionedIds = parseMentions(data.content, candidates);
  await notifyMany(mentionedIds, session.user.id, {
    type: "MENTION",
    titre: `Vous avez été mentionné(e) dans un commentaire : ${task.titre}`,
    lien: `/taches/${taskId}`,
    entityType: "TaskComment",
    entityId: comment.id,
  });

  revalidatePath(`/taches/${taskId}`);
  return comment;
}

export async function addChecklistItem(taskId: string, label: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = addChecklistItemSchema.parse({ taskId, label });

  const item = await prisma.checklistItem.create({
    data: { taskId: data.taskId, label: data.label },
  });

  revalidatePath(`/taches/${taskId}`);
  return item;
}

export async function toggleChecklistItem(itemId: string, isDone: boolean) {
  await requireSession();

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { isDone },
  });

  revalidatePath(`/taches/${item.taskId}`);
  return item;
}

export async function addDependency(taskId: string, dependsOnTaskId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = addDependencySchema.parse({ taskId, dependsOnTaskId });

  if (data.taskId === data.dependsOnTaskId) {
    throw new Error("Une tâche ne peut pas dépendre d'elle-même.");
  }

  const dependency = await prisma.taskDependency.create({
    data: { taskId: data.taskId, dependsOnTaskId: data.dependsOnTaskId },
  });

  revalidatePath(`/taches/${taskId}`);
  return dependency;
}

export async function updateActualTime(taskId: string, tempsReelHeures: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = updateActualTimeSchema.parse({ taskId, tempsReelHeures });

  const task = await prisma.task.update({
    where: { id: data.taskId },
    data: { tempsReelHeures: Number(data.tempsReelHeures) },
  });

  revalidatePath(`/taches/${taskId}`);
  revalidatePath("/charge-de-travail");
  return task;
}
