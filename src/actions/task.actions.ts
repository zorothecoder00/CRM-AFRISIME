"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { requireScopedPermission } from "@/lib/permissions-scoped";
import { createNotification, notifyMany } from "@/lib/notify";
import { parseMentions } from "@/lib/mentions";
import { logAudit } from "@/lib/audit";
import { recomputeProjectProgress } from "@/lib/project-progress";
import {
  runTaskCompletedRules,
  runValidationRejectedRules,
  runTaskCreatedRules,
  runTaskStatusChangedRules,
} from "@/lib/automation";
import { startValidationRun, decideCurrentStep } from "@/lib/validation-workflow";
import { suggestAssignees, type CandidateScore } from "@/lib/resource-allocation";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  addCommentSchema,
  addChecklistItemSchema,
  addDependencySchema,
  updateActualTimeSchema,
  linkTaskExternalContactSchema,
  type CreateTaskInput,
  type LinkTaskExternalContactInput,
} from "@/lib/validations/task.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createTask(input: CreateTaskInput) {
  const session = await requireSession();
  const data = createTaskSchema.parse(input);
  // Portee par projet (cahier des charges §19) : une derogation
  // PermissionOverride pour ce projet peut accorder ou retirer le droit
  // meme si le role de l'utilisateur en decide autrement.
  await requireScopedPermission(session.user.permissions, PERMISSIONS.TASK_CREATE, session.user.id, {
    projectId: data.projectId,
  });

  // Co-responsables (cahier des charges §6) : distincts du responsable
  // principal, dedupliques pour eviter une contrainte unique violee.
  const assigneeIds = Array.from(
    new Set(data.assigneeIds.filter((id) => id !== data.responsablePrincipalId))
  );

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
      objectiveId: data.objectiveId || undefined,
      planId: data.planId || undefined,
      createdById: session.user.id,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
    changes: { titre: task.titre },
  });

  const notifyIds = Array.from(new Set([task.responsablePrincipalId, ...assigneeIds]));
  await notifyMany(notifyIds, session.user.id, {
    type: "NOUVELLE_TACHE",
    titre: `Nouvelle tâche assignée : ${task.titre}`,
    lien: `/taches/${task.id}`,
    entityType: "Task",
    entityId: task.id,
  });

  await runTaskCreatedRules({
    id: task.id,
    titre: task.titre,
    projectId: task.projectId,
    responsablePrincipalId: task.responsablePrincipalId,
    priorite: task.priorite,
  });

  revalidatePath("/taches");
  revalidatePath(`/projets/${data.projectId}`);
  return task;
}

/** V2.2 §9.2 — allocation intelligente : profils suggérés pour une tâche à créer. */
export async function suggestTaskAssignees(projectId: string, echeance?: string): Promise<CandidateScore[]> {
  await requireSession();
  return suggestAssignees({ projectId, echeance: echeance ? new Date(echeance) : undefined });
}

export async function updateTaskStatus(taskId: string, statut: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = updateTaskStatusSchema.parse({ taskId, statut });

  const task = await prisma.task.update({
    where: { id: data.taskId },
    data: {
      statut: data.statut,
      avancement: data.statut === "TERMINEE" ? 100 : undefined,
      completedAt: data.statut === "TERMINEE" ? new Date() : null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "task.status_changed",
    entityType: "Task",
    entityId: task.id,
    changes: { statut: data.statut },
  });

  await recomputeProjectProgress(task.projectId);

  if (data.statut === "TERMINEE") {
    await runTaskCompletedRules({
      id: task.id,
      titre: task.titre,
      projectId: task.projectId,
      responsablePrincipalId: task.responsablePrincipalId,
    });
  }
  await runTaskStatusChangedRules({
    id: task.id,
    titre: task.titre,
    projectId: task.projectId,
    responsablePrincipalId: task.responsablePrincipalId,
    priorite: task.priorite,
  });

  revalidatePath("/taches");
  revalidatePath(`/taches/${taskId}`);
  revalidatePath(`/projets/${task.projectId}`);
  return task;
}

/**
 * Le responsable soumet son travail pour validation (cahier des charges §9) :
 * démarre une instance du circuit de validation actif (Administration >
 * Circuits de validation) et notifie l'approbateur de la première étape.
 */
export async function submitForValidation(taskId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { statut: "EN_REVISION" },
  });

  await startValidationRun({
    taskId: task.id,
    taskTitre: task.titre,
    submittedById: session.user.id,
  });

  revalidatePath(`/taches/${taskId}`);
  return task;
}

/**
 * Décide l'étape courante du circuit de validation d'une tâche (cahier des
 * charges §9). Un refus renvoie immédiatement la tâche à son créateur et
 * déclenche les règles TASK_VALIDATION_REJECTED ; une approbation avance à
 * l'étape suivante si le circuit en compte d'autres, sinon termine la tâche
 * et notifie le créateur (symétrique au refus, corrige l'ancienne asymétrie).
 */
export async function validateTask(taskId: string, approved: boolean, commentaire?: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_VALIDATE);

  const existing = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (existing.statut !== "EN_REVISION") {
    throw new Error("Cette tâche n'est pas en attente de validation.");
  }

  const { finalStatus } = await decideCurrentStep({
    taskId,
    approverId: session.user.id,
    approverRoleKey: session.user.roleKey,
    approved,
    commentaire,
  });

  if (finalStatus === "EN_COURS") {
    // Étape franchie, encore d'autres approbateurs à venir : la tâche reste en révision.
    revalidatePath(`/taches/${taskId}`);
    return existing;
  }

  if (finalStatus === "APPROUVE") {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { statut: "TERMINEE", avancement: 100, completedAt: new Date() },
    });
    await recomputeProjectProgress(task.projectId);
    await runTaskCompletedRules({
      id: task.id,
      titre: task.titre,
      projectId: task.projectId,
      responsablePrincipalId: task.responsablePrincipalId,
    });
    if (task.createdById !== session.user.id) {
      await createNotification({
        userId: task.createdById,
        type: "VALIDATION",
        titre: `Votre tâche a été validée : ${task.titre}`,
        lien: `/taches/${taskId}`,
        entityType: "Task",
        entityId: task.id,
      });
    }
    revalidatePath(`/taches/${taskId}`);
    revalidatePath(`/projets/${task.projectId}`);
    return task;
  }

  // REJETE
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { statut: "A_FAIRE", responsablePrincipalId: existing.createdById },
  });

  if (task.createdById !== session.user.id) {
    await createNotification({
      userId: task.createdById,
      type: "VALIDATION",
      titre: `Votre tâche a été refusée et vous a été renvoyée : ${task.titre}`,
      lien: `/taches/${taskId}`,
      entityType: "Task",
      entityId: task.id,
    });
  }

  await runValidationRejectedRules({
    id: task.id,
    titre: task.titre,
    projectId: task.projectId,
    responsablePrincipalId: task.responsablePrincipalId,
  });

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

  await logAudit({
    userId: session.user.id,
    action: "task.comment_added",
    entityType: "Task",
    entityId: data.taskId,
    changes: { commentId: comment.id },
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

export async function addChecklistItem(
  taskId: string,
  label: string,
  responsableId?: string,
  echeance?: string
) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = addChecklistItemSchema.parse({ taskId, label, responsableId, echeance });

  const item = await prisma.checklistItem.create({
    data: {
      taskId: data.taskId,
      label: data.label,
      responsableId: data.responsableId || undefined,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "task.checklist_item_added",
    entityType: "Task",
    entityId: data.taskId,
    changes: { label: item.label, responsableId: item.responsableId, echeance: item.echeance },
  });

  revalidatePath(`/taches/${taskId}`);
  return item;
}

export async function toggleChecklistItem(itemId: string, isDone: boolean) {
  const session = await requireSession();

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { isDone },
  });

  await logAudit({
    userId: session.user.id,
    action: "task.checklist_item_toggled",
    entityType: "Task",
    entityId: item.taskId,
    changes: { itemId: item.id, isDone },
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

  await logAudit({
    userId: session.user.id,
    action: "task.dependency_added",
    entityType: "Task",
    entityId: taskId,
    changes: { dependsOnTaskId },
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

  await logAudit({
    userId: session.user.id,
    action: "task.actual_time_updated",
    entityType: "Task",
    entityId: data.taskId,
    changes: { tempsReelHeures: data.tempsReelHeures },
  });

  revalidatePath(`/taches/${taskId}`);
  revalidatePath("/charge-de-travail");
  return task;
}

/**
 * Delegue (ou retire) cette tache comme mission a un contact CRM externe
 * (cahier des charges §XXI — "portail prestataire, avec missions et
 * livrables"). Le contact voit alors la tache dans son portail ; ses
 * documents lies en tiennent lieu de livrables.
 */
export async function linkTaskExternalContact(input: LinkTaskExternalContactInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_ASSIGN);
  const data = linkTaskExternalContactSchema.parse(input);

  const task = await prisma.task.update({
    where: { id: data.taskId },
    data: { externalContactId: data.externalContactId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: data.externalContactId ? "task.mission_assigned" : "task.mission_unassigned",
    entityType: "Task",
    entityId: task.id,
    changes: { externalContactId: data.externalContactId ?? null },
  });

  revalidatePath(`/taches/${data.taskId}`);
  return task;
}

const TASK_VIEWS = ["liste", "kanban", "chronologie", "gantt", "mindmap", "portefeuille", "blanc"];

/** Mémorise la vue choisie (cahier des charges §7 : "chaque utilisateur choisit sa vue"). */
export async function setDefaultTaskView(vue: string) {
  const session = await requireSession();
  if (!TASK_VIEWS.includes(vue)) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { defaultTaskView: vue },
  });
}
