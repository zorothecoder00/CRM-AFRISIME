"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { recomputeParentTaskFromSubtasks } from "@/lib/project-progress";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Corbeille (cahier des charges V2.2 §37 — "suppression contrôlée").
 * "Supprimer" marque deletedAt/deletedById au lieu d'effacer (Project/Task/
 * Document, voir prisma/schema.prisma) ; la purge définitive (voir
 * purgeTrashItem plus bas) reste une action manuelle et explicite, jamais
 * automatique — un `prisma.delete` sur un Project/Task avec des enfants
 * existants (tâches, documents, réunions...) échouerait de toute façon sur
 * une contrainte de clé étrangère (aucune relation n'est en onDelete:
 * Cascade), donc un cron aveugle serait à la fois dangereux (s'il cascadait)
 * et peu fiable (s'il ne cascadait pas). Un admin voit l'erreur et agit en
 * connaissance de cause plutôt qu'une purge silencieuse en arrière-plan.
 */

export async function deleteProject(projectId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_DELETE);

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date(), deletedById: session.user.id },
  });
  await logAudit({ userId: session.user.id, action: "project.deleted", entityType: "Project", entityId: projectId });

  revalidatePath("/projets");
  revalidatePath("/corbeille");
  // Pas de redirect() ici : cette action est appelee depuis un composant
  // client via useAction (try/catch), qui intercepterait l'erreur speciale
  // NEXT_REDIRECT avant que Next.js ne la traite — l'appelant navigue lui-
  // meme via router.push() apres un resultat { ok: true }.
  return { redirectTo: "/projets" };
}

export async function restoreProject(projectId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_DELETE);

  await prisma.project.update({ where: { id: projectId }, data: { deletedAt: null, deletedById: null } });
  await logAudit({ userId: session.user.id, action: "project.restored", entityType: "Project", entityId: projectId });

  revalidatePath("/projets");
  revalidatePath("/corbeille");
}

export async function deleteTask(taskId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_DELETE);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date(), deletedById: session.user.id },
    select: { projectId: true, parentTaskId: true },
  });
  await logAudit({ userId: session.user.id, action: "task.deleted", entityType: "Task", entityId: taskId });

  if (task.parentTaskId) await recomputeParentTaskFromSubtasks(task.parentTaskId);

  revalidatePath(`/projets/${task.projectId}`);
  revalidatePath("/taches");
  if (task.parentTaskId) revalidatePath(`/taches/${task.parentTaskId}`);
  revalidatePath("/corbeille");
  return { redirectTo: `/projets/${task.projectId}` };
}

export async function restoreTask(taskId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_DELETE);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: null, deletedById: null },
    select: { projectId: true, parentTaskId: true },
  });
  await logAudit({ userId: session.user.id, action: "task.restored", entityType: "Task", entityId: taskId });

  if (task.parentTaskId) await recomputeParentTaskFromSubtasks(task.parentTaskId);

  revalidatePath(`/projets/${task.projectId}`);
  revalidatePath("/taches");
  if (task.parentTaskId) revalidatePath(`/taches/${task.parentTaskId}`);
  revalidatePath("/corbeille");
}

export async function deleteDocument(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_DELETE);

  const document = await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date(), deletedById: session.user.id },
    select: { projectId: true },
  });
  await logAudit({ userId: session.user.id, action: "document.deleted", entityType: "Document", entityId: documentId });

  revalidatePath("/documents");
  revalidatePath(`/projets/${document.projectId}`);
  revalidatePath("/corbeille");
  return { redirectTo: "/documents" };
}

export async function restoreDocument(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_DELETE);

  const document = await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: null, deletedById: null },
    select: { projectId: true },
  });
  await logAudit({ userId: session.user.id, action: "document.restored", entityType: "Document", entityId: documentId });

  revalidatePath("/documents");
  revalidatePath(`/projets/${document.projectId}`);
  revalidatePath("/corbeille");
}

type TrashEntityType = "Project" | "Task" | "Document";

/** Purge définitive — action manuelle explicite (voir le commentaire en tête de fichier). */
export async function purgeTrashItem(entityType: TrashEntityType, id: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TRASH_MANAGE);

  try {
    if (entityType === "Project") await prisma.project.delete({ where: { id } });
    if (entityType === "Task") await prisma.task.delete({ where: { id } });
    if (entityType === "Document") await prisma.document.delete({ where: { id } });
  } catch {
    throw new Error(
      "Suppression impossible : cet élément a encore des données liées (tâches, documents, réunions…). Supprimez-les d'abord."
    );
  }

  await logAudit({ userId: session.user.id, action: "trash.purged", entityType, entityId: id });
  revalidatePath("/corbeille");
}
