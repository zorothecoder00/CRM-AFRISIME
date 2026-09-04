"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { requireScopedPermission } from "@/lib/permissions-scoped";
import { createNotification, notifyMany } from "@/lib/notify";
import { parseMentions } from "@/lib/mentions";
import { logAudit } from "@/lib/audit";
import { recomputeProjectProgress, recomputeParentTaskFromSubtasks } from "@/lib/project-progress";
import {
  runTaskCompletedRules,
  runValidationRejectedRules,
  runTaskCreatedRules,
  runTaskStatusChangedRules,
  runTaskBlockedRules,
} from "@/lib/automation";
import { startValidationRun, decideCurrentStep } from "@/lib/validation-workflow";
import { suggestAssignees, type CandidateScore } from "@/lib/resource-allocation";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskPrioritySchema,
  addCommentSchema,
  addChecklistItemSchema,
  addDependencySchema,
  updateActualTimeSchema,
  linkTaskExternalContactSchema,
  convertSectionToTaskSchema,
  addSubtaskSchema,
  convertChecklistItemToSubtaskSchema,
  createTaskDateChangeRequestSchema,
  decideTaskDateChangeRequestSchema,
  type CreateTaskDateChangeRequestInput,
  type DecideTaskDateChangeRequestInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type LinkTaskExternalContactInput,
  type ConvertSectionToTaskInput,
  type AddSubtaskInput,
  type ConvertChecklistItemToSubtaskInput,
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

  const { task, subtasks } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const created = await tx.task.create({
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
        organizationId: session.user.organizationId,
        assignees: {
          create: assigneeIds.map((userId) => ({ userId, organizationId: session.user.organizationId })),
        },
        competencesRequises: data.competenceIds.length > 0 ? { connect: data.competenceIds.map((id) => ({ id })) } : undefined,
      },
    });

    // Sous-tâches créées en même temps que la tâche parente, sans passer par
    // le détail — voir createTaskSchema. Un createMany + parentTaskId
    // n'aurait pas retourné les lignes créées (notification/automatisation
    // en ont besoin), d'où la boucle de create() individuels.
    const createdSubtasks = [];
    for (const sub of data.subtasks) {
      const subtask = await tx.task.create({
        data: {
          projectId: data.projectId,
          sectionId: data.sectionId || undefined,
          parentTaskId: created.id,
          titre: sub.titre,
          priorite: sub.priorite,
          responsablePrincipalId: sub.responsablePrincipalId,
          dateDebut: sub.dateDebut ? new Date(sub.dateDebut) : undefined,
          echeance: sub.echeance ? new Date(sub.echeance) : undefined,
          createdById: session.user.id,
          organizationId: session.user.organizationId,
        },
      });
      createdSubtasks.push(subtask);
    }

    return { task: created, subtasks: createdSubtasks };
  });

  await logAudit({
    userId: session.user.id,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
    changes: { titre: task.titre, subtasksCount: subtasks.length },
  });

  const notifyIds = Array.from(new Set([task.responsablePrincipalId, ...assigneeIds]));
  await notifyMany(notifyIds, session.user.id, {
    type: "NOUVELLE_TACHE",
    titre: `Nouvelle tâche assignée : ${task.titre}`,
    lien: `/taches/${task.id}`,
    entityType: "Task",
    entityId: task.id,
  });

  for (const subtask of subtasks) {
    await notifyMany([subtask.responsablePrincipalId], session.user.id, {
      type: "NOUVELLE_TACHE",
      titre: `Nouvelle sous-tâche assignée : ${subtask.titre}`,
      lien: `/taches/${subtask.id}`,
      entityType: "Task",
      entityId: subtask.id,
    });
    await runTaskCreatedRules({
      id: subtask.id,
      titre: subtask.titre,
      projectId: subtask.projectId,
      responsablePrincipalId: subtask.responsablePrincipalId,
      priorite: subtask.priorite,
    });
  }

  await runTaskCreatedRules({
    id: task.id,
    titre: task.titre,
    projectId: task.projectId,
    responsablePrincipalId: task.responsablePrincipalId,
    priorite: task.priorite,
  });

  revalidatePath("/taches");
  revalidatePath(`/projets/${data.projectId}`);
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
}

/** V2.2 §9.2 — allocation intelligente : profils suggérés pour une tâche à créer. */
export async function suggestTaskAssignees(
  projectId: string,
  echeance?: string,
  competenceIds?: string[],
  priorite?: string
): Promise<CandidateScore[]> {
  await requireSession();
  return suggestAssignees({
    projectId,
    echeance: echeance ? new Date(echeance) : undefined,
    competenceIds,
    priorite,
  });
}

export async function updateTask(input: UpdateTaskInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = updateTaskSchema.parse(input);

  // Le responsable principal et les assignes d'une tache ne peuvent pas
  // changer ses dates directement (demande utilisateur) — seulement en
  // faire la demande, voir requestTaskDateChange/decideTaskDateChange.
  // Verifie ici (pas seulement cote UI/TaskEditDialog) pour rester correct
  // quel que soit l'appelant.
  const existing = await prisma.task.findUniqueOrThrow({
    where: { id: data.id },
    select: { responsablePrincipalId: true, assignees: { select: { userId: true } }, dateDebut: true, echeance: true, parentTaskId: true },
  });
  const isOwner =
    existing.responsablePrincipalId === session.user.id ||
    existing.assignees.some((a) => a.userId === session.user.id);
  if (isOwner) {
    const newDateDebut = data.dateDebut ? new Date(data.dateDebut).getTime() : null;
    const oldDateDebut = existing.dateDebut ? existing.dateDebut.getTime() : null;
    const newEcheance = data.echeance ? new Date(data.echeance).getTime() : null;
    const oldEcheance = existing.echeance ? existing.echeance.getTime() : null;
    if (newDateDebut !== oldDateDebut || newEcheance !== oldEcheance) {
      throw new Error(
        "Vous ne pouvez pas modifier directement les dates de cette tâche — faites une demande de report."
      );
    }
  }

  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.update({
      where: { id: data.id },
      data: {
        titre: data.titre,
        description: data.description || null,
        priorite: data.priorite,
        responsablePrincipalId: data.responsablePrincipalId,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        echeance: data.echeance ? new Date(data.echeance) : null,
        tempsEstimeHeures: data.tempsEstimeHeures ? Number(data.tempsEstimeHeures) : null,
        poidsAvancement: data.poidsAvancement ? Number(data.poidsAvancement) : null,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "task.updated",
    entityType: "Task",
    entityId: task.id,
    changes: { titre: task.titre },
  });

  // Demande utilisateur — un poids d'avancement modifié sur une sous-tâche
  // change immédiatement le % calculé de sa tâche mère (voir
  // recomputeParentTaskFromSubtasks) ; no-op si `task` n'est pas une sous-tâche.
  if (existing.parentTaskId) {
    await recomputeParentTaskFromSubtasks(existing.parentTaskId);
  }

  revalidatePath("/taches");
  revalidatePath(`/taches/${task.id}`);
  revalidatePath(`/projets/${task.projectId}`);
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
}

/** Sous-tâches d'une tâche existante — alimente la section "Sous-tâches" de la fiche tâche. */
export async function getSubtasksForTask(parentTaskId: string) {
  await requireSession();
  const subtasks = await prisma.task.findMany({
    where: { parentTaskId, deletedAt: null },
    include: { responsablePrincipal: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return subtasks.map((s) => ({
    id: s.id,
    titre: s.titre,
    statut: s.statut,
    priorite: s.priorite,
    responsablePrincipalId: s.responsablePrincipalId,
    responsableNom: s.responsablePrincipal.name,
    dateDebut: s.dateDebut ? s.dateDebut.toISOString() : null,
    echeance: s.echeance ? s.echeance.toISOString() : null,
  }));
}

/** Ajout d'une sous-tâche à une tâche déjà existante (édition, hors création groupée). */
export async function addSubtask(input: AddSubtaskInput) {
  const session = await requireSession();
  const data = addSubtaskSchema.parse(input);

  const parent = await prisma.task.findUniqueOrThrow({
    where: { id: data.parentTaskId },
    select: { projectId: true, sectionId: true },
  });

  await requireScopedPermission(session.user.permissions, PERMISSIONS.TASK_CREATE, session.user.id, {
    projectId: parent.projectId,
  });

  const subtask = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.create({
      data: {
        projectId: parent.projectId,
        sectionId: parent.sectionId || undefined,
        parentTaskId: data.parentTaskId,
        titre: data.titre,
        priorite: data.priorite,
        responsablePrincipalId: data.responsablePrincipalId,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        echeance: data.echeance ? new Date(data.echeance) : undefined,
        poidsAvancement: data.poidsAvancement ? Number(data.poidsAvancement) : undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
      include: { responsablePrincipal: { select: { name: true } } },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "task.subtask_added",
    entityType: "Task",
    entityId: subtask.id,
    changes: { titre: subtask.titre, parentTaskId: data.parentTaskId },
  });

  await notifyMany([subtask.responsablePrincipalId], session.user.id, {
    type: "NOUVELLE_TACHE",
    titre: `Nouvelle sous-tâche assignée : ${subtask.titre}`,
    lien: `/taches/${subtask.id}`,
    entityType: "Task",
    entityId: subtask.id,
  });
  await runTaskCreatedRules({
    id: subtask.id,
    titre: subtask.titre,
    projectId: subtask.projectId,
    responsablePrincipalId: subtask.responsablePrincipalId,
    priorite: subtask.priorite,
  });

  await recomputeParentTaskFromSubtasks(data.parentTaskId);

  revalidatePath(`/taches/${data.parentTaskId}`);
  revalidatePath("/taches");
  revalidatePath(`/projets/${parent.projectId}`);

  return {
    id: subtask.id,
    titre: subtask.titre,
    statut: subtask.statut,
    priorite: subtask.priorite,
    responsablePrincipalId: subtask.responsablePrincipalId,
    responsableNom: subtask.responsablePrincipal.name,
    dateDebut: subtask.dateDebut ? subtask.dateDebut.toISOString() : null,
    echeance: subtask.echeance ? subtask.echeance.toISOString() : null,
  };
}

export async function updateTaskStatus(taskId: string, statut: string) {
  const session = await requireSession();
  const data = updateTaskStatusSchema.parse({ taskId, statut });

  // Le responsable principal et les co-responsables d'une tache peuvent
  // toujours changer SON statut, meme sans TASK_UPDATE au niveau du role —
  // c'est leur travail assigne. Tout le monde d'autre reste soumis a
  // TASK_UPDATE. Verifie sur la tache elle-meme, pas sur la permission
  // globale, donc s'applique pareil qu'il s'agisse d'une tache ou d'une
  // sous-tache.
  const existing = await prisma.task.findUniqueOrThrow({
    where: { id: data.taskId },
    select: { responsablePrincipalId: true, assignees: { select: { userId: true } } },
  });
  const isOwner =
    existing.responsablePrincipalId === session.user.id ||
    existing.assignees.some((a) => a.userId === session.user.id);
  if (!isOwner) {
    requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);
  }

  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.update({
      where: { id: data.taskId },
      data: {
        statut: data.statut,
        // Symetrique : avancement n'est jamais saisi a la main nulle part
        // dans l'appli (uniquement derive du statut ici, ou de la moyenne
        // des sous-taches par recomputeParentTaskFromSubtasks) — sans ce
        // reset, rouvrir une tache Terminee la laissait bloquee a 100 %.
        avancement: data.statut === "TERMINEE" ? 100 : 0,
        completedAt: data.statut === "TERMINEE" ? new Date() : null,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "task.status_changed",
    entityType: "Task",
    entityId: task.id,
    changes: { statut: data.statut },
  });

  // Notification directe et systematique, independante du moteur
  // AutomationRule (optionnel/configurable) : le responsable et les
  // assignes doivent toujours savoir qu'un collegue a change le statut.
  await notifyMany([existing.responsablePrincipalId, ...existing.assignees.map((a) => a.userId)], session.user.id, {
    type: "STATUT_MODIFIE",
    titre: `${session.user.name ?? "Un collègue"} a changé le statut de « ${task.titre} » → ${data.statut}`,
    lien: `/taches/${task.id}`,
    entityType: "Task",
    entityId: task.id,
  });

  await recomputeProjectProgress(task.projectId);
  // Statut/avancement d'une tache mere derives de ses sous-taches (voir
  // recomputeParentTaskFromSubtasks) — no-op si `task` n'est pas une
  // sous-tache (parentTaskId null).
  if (task.parentTaskId) {
    await recomputeParentTaskFromSubtasks(task.parentTaskId);
  }

  if (data.statut === "TERMINEE") {
    await runTaskCompletedRules({
      id: task.id,
      titre: task.titre,
      projectId: task.projectId,
      responsablePrincipalId: task.responsablePrincipalId,
    });
  }
  if (data.statut === "BLOQUEE") {
    await runTaskBlockedRules({
      id: task.id,
      titre: task.titre,
      projectId: task.projectId,
      responsablePrincipalId: task.responsablePrincipalId,
      priorite: task.priorite,
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
  if (task.parentTaskId) revalidatePath(`/taches/${task.parentTaskId}`);
  revalidatePath(`/projets/${task.projectId}`);
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
}

export async function updateTaskPriority(taskId: string, priorite: string) {
  const session = await requireSession();
  const data = updateTaskPrioritySchema.parse({ taskId, priorite });

  // Meme regle d'autorisation que updateTaskStatus : le responsable
  // principal et les co-responsables peuvent toujours changer LEUR
  // priorite, sans TASK_UPDATE au niveau du role.
  const existing = await prisma.task.findUniqueOrThrow({
    where: { id: data.taskId },
    select: { responsablePrincipalId: true, assignees: { select: { userId: true } }, projectId: true, parentTaskId: true },
  });
  const isOwner =
    existing.responsablePrincipalId === session.user.id ||
    existing.assignees.some((a) => a.userId === session.user.id);
  if (!isOwner) {
    requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);
  }

  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.update({
      where: { id: data.taskId },
      data: { priorite: data.priorite },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "task.priority_changed",
    entityType: "Task",
    entityId: task.id,
    changes: { priorite: data.priorite },
  });

  revalidatePath("/taches");
  revalidatePath(`/taches/${taskId}`);
  if (task.parentTaskId) revalidatePath(`/taches/${task.parentTaskId}`);
  revalidatePath(`/projets/${task.projectId}`);
  return task;
}

/**
 * Demande utilisateur : le responsable principal/les assignes d'une tache ne
 * peuvent pas changer dateDebut/echeance directement (voir updateTask),
 * seulement en faire la demande ici, avec un motif. requestedDateDebut et
 * requestedEcheance sont chacun optionnels (on peut ne demander a changer
 * que l'un des deux) — createTaskDateChangeRequestSchema exige au moins un
 * des deux.
 */
export async function requestTaskDateChange(input: CreateTaskDateChangeRequestInput) {
  const session = await requireSession();
  const data = createTaskDateChangeRequestSchema.parse(input);

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: data.taskId },
    select: {
      titre: true,
      dateDebut: true,
      echeance: true,
      responsablePrincipalId: true,
      createdById: true,
      assignees: { select: { userId: true } },
      organizationId: true,
    },
  });
  const isOwner =
    task.responsablePrincipalId === session.user.id ||
    task.assignees.some((a) => a.userId === session.user.id);
  if (!isOwner) {
    throw new Error("Seuls le responsable principal et les assignés de la tâche peuvent demander un report de date.");
  }

  const request = await prisma.taskDateChangeRequest.create({
    data: {
      taskId: data.taskId,
      requestedById: session.user.id,
      currentDateDebut: task.dateDebut,
      requestedDateDebut: data.requestedDateDebut ? new Date(data.requestedDateDebut) : undefined,
      currentEcheance: task.echeance,
      requestedEcheance: data.requestedEcheance ? new Date(data.requestedEcheance) : undefined,
      motif: data.motif,
      organizationId: session.user.organizationId,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "task.date_change_requested",
    entityType: "Task",
    entityId: data.taskId,
    changes: { requestedDateDebut: data.requestedDateDebut, requestedEcheance: data.requestedEcheance },
  });

  // Approbateur : le responsable principal decide des demandes des
  // co-assignes ; quand c'est le responsable principal lui-meme qui demande,
  // le createur de la tache sert de destinataire raisonnable (l'autorisation
  // reelle a la decision, elle, reste ouverte a quiconque a TASK_UPDATE — voir
  // decideTaskDateChange). Pas de notif si la seule cible serait soi-meme
  // (tache auto-creee et auto-attribuee).
  const notifyUserId = session.user.id === task.responsablePrincipalId ? task.createdById : task.responsablePrincipalId;
  if (notifyUserId !== session.user.id) {
    await createNotification({
      userId: notifyUserId,
      type: "DEMANDE_REPORT_ECHEANCE",
      titre: `${session.user.name ?? "Un collègue"} demande un report de date pour « ${task.titre} »`,
      lien: `/taches/${data.taskId}`,
      entityType: "Task",
      entityId: data.taskId,
    });
  }

  revalidatePath(`/taches/${data.taskId}`);
  revalidatePath("/taches");
  return {
    ...request,
    currentDateDebut: request.currentDateDebut ? request.currentDateDebut.toISOString() : null,
    requestedDateDebut: request.requestedDateDebut ? request.requestedDateDebut.toISOString() : null,
    currentEcheance: request.currentEcheance ? request.currentEcheance.toISOString() : null,
    requestedEcheance: request.requestedEcheance ? request.requestedEcheance.toISOString() : null,
  };
}

/**
 * Decision sur une demande de report de date. Autorisation : le responsable
 * principal peut decider des demandes des AUTRES (co-assignes) ; sinon il
 * faut la permission TASK_UPDATE (couvre a la fois "quelqu'un avec la
 * permission de gerer les taches" ET le cas ou le responsable principal a
 * lui-meme fait la demande — il ne peut alors pas se l'auto-approuver).
 */
export async function decideTaskDateChange(input: DecideTaskDateChangeRequestInput) {
  const session = await requireSession();
  const data = decideTaskDateChangeRequestSchema.parse(input);

  const existing = await prisma.taskDateChangeRequest.findUniqueOrThrow({
    where: { id: data.requestId },
    include: { task: { select: { id: true, titre: true, responsablePrincipalId: true, organizationId: true } } },
  });
  if (existing.statut !== "EN_ATTENTE") {
    throw new Error("Cette demande a déjà été traitée.");
  }

  const isPrincipalDecidingOthersRequest =
    session.user.id === existing.task.responsablePrincipalId && existing.requestedById !== existing.task.responsablePrincipalId;
  if (!isPrincipalDecidingOthersRequest) {
    requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);
  }

  const request = await withTenantScopedSession(existing.task.organizationId ?? session.user.organizationId, async (tx) => {
    const updated = await tx.taskDateChangeRequest.update({
      where: { id: data.requestId },
      data: {
        statut: data.statut,
        decidedById: session.user.id,
        decisionMotif: data.decisionMotif || null,
        decidedAt: new Date(),
      },
    });

    if (data.statut === "ACCEPTEE") {
      await tx.task.update({
        where: { id: existing.taskId },
        data: {
          dateDebut: existing.requestedDateDebut ?? undefined,
          echeance: existing.requestedEcheance ?? undefined,
        },
      });
    }

    return updated;
  });

  await logAudit({
    userId: session.user.id,
    action: "task.date_change_decided",
    entityType: "Task",
    entityId: existing.taskId,
    changes: { statut: data.statut },
  });

  await createNotification({
    userId: existing.requestedById,
    type: "DEMANDE_REPORT_ECHEANCE_DECISION",
    titre:
      data.statut === "ACCEPTEE"
        ? `${session.user.name ?? "Un collègue"} a accepté votre demande de report pour « ${existing.task.titre} »`
        : `${session.user.name ?? "Un collègue"} a refusé votre demande de report pour « ${existing.task.titre} »`,
    lien: `/taches/${existing.taskId}`,
    entityType: "Task",
    entityId: existing.taskId,
  });

  revalidatePath(`/taches/${existing.taskId}`);
  revalidatePath("/taches");
  return {
    ...request,
    currentDateDebut: request.currentDateDebut ? request.currentDateDebut.toISOString() : null,
    requestedDateDebut: request.requestedDateDebut ? request.requestedDateDebut.toISOString() : null,
    currentEcheance: request.currentEcheance ? request.currentEcheance.toISOString() : null,
    requestedEcheance: request.requestedEcheance ? request.requestedEcheance.toISOString() : null,
  };
}

/**
 * Le responsable soumet son travail pour validation (cahier des charges §9) :
 * démarre une instance du circuit de validation actif (Administration >
 * Circuits de validation) et notifie l'approbateur de la première étape.
 */
export async function submitForValidation(taskId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.update({
      where: { id: taskId },
      data: { statut: "EN_REVISION" },
    })
  );

  await startValidationRun({
    taskId: task.id,
    taskTitre: task.titre,
    submittedById: session.user.id,
  });

  revalidatePath(`/taches/${taskId}`);
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
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

  const existing = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.findUniqueOrThrow({ where: { id: taskId } })
  );
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
    return { ...existing, tempsEstimeHeures: existing.tempsEstimeHeures ? Number(existing.tempsEstimeHeures) : null, tempsReelHeures: existing.tempsReelHeures ? Number(existing.tempsReelHeures) : null };
  }

  if (finalStatus === "APPROUVE") {
    const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
      tx.task.update({
        where: { id: taskId },
        data: { statut: "TERMINEE", avancement: 100, completedAt: new Date() },
      })
    );
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
    return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
  }

  // REJETE
  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.update({
      where: { id: taskId },
      data: { statut: "A_FAIRE", responsablePrincipalId: existing.createdById },
    })
  );

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
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
}

export async function addComment(taskId: string, content: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_COMMENT);

  const data = addCommentSchema.parse({ taskId, content });

  const { task, comment } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const task = await tx.task.findUniqueOrThrow({
      where: { id: data.taskId },
      include: {
        responsablePrincipal: true,
        assignees: { include: { user: true } },
        project: { include: { members: { include: { user: true } } } },
      },
    });

    const comment = await tx.taskComment.create({
      data: {
        taskId: data.taskId,
        content: data.content,
        authorId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    return { task, comment };
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

  const item = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.checklistItem.create({
      data: {
        taskId: data.taskId,
        label: data.label,
        responsableId: data.responsableId || undefined,
        echeance: data.echeance ? new Date(data.echeance) : undefined,
        organizationId: session.user.organizationId,
      },
    })
  );

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

  const item = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.checklistItem.update({
      where: { id: itemId },
      data: { isDone },
    })
  );

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

/**
 * Transforme un élément de checklist en sous-tâche à part entière (statut,
 * priorité, dates propres) — l'élément de checklist disparaît, remplacé par
 * la sous-tâche créée, plutôt que de dupliquer l'information.
 */
export async function convertChecklistItemToSubtask(input: ConvertChecklistItemToSubtaskInput) {
  const session = await requireSession();
  const data = convertChecklistItemToSubtaskSchema.parse(input);

  const item = await prisma.checklistItem.findUniqueOrThrow({
    where: { id: data.checklistItemId },
    include: { task: { select: { id: true, projectId: true, sectionId: true, responsablePrincipalId: true } } },
  });

  await requireScopedPermission(session.user.permissions, PERMISSIONS.TASK_CREATE, session.user.id, {
    projectId: item.task.projectId,
  });

  // A defaut de responsable propre sur l'element de checklist, reprend celui
  // de la tache parente plutot que de bloquer la conversion sur un champ
  // manquant — reassignable ensuite comme n'importe quelle sous-tache.
  const responsablePrincipalId = item.responsableId ?? item.task.responsablePrincipalId;

  const subtask = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId: item.task.projectId,
        sectionId: item.task.sectionId || undefined,
        parentTaskId: item.task.id,
        titre: item.label,
        responsablePrincipalId,
        echeance: item.echeance || undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
      include: { responsablePrincipal: { select: { name: true } } },
    });
    await tx.checklistItem.delete({ where: { id: item.id } });
    return created;
  });

  await logAudit({
    userId: session.user.id,
    action: "task.checklist_item_converted_to_subtask",
    entityType: "Task",
    entityId: subtask.id,
    changes: { fromChecklistItemId: item.id, titre: subtask.titre },
  });

  await notifyMany([subtask.responsablePrincipalId], session.user.id, {
    type: "NOUVELLE_TACHE",
    titre: `Nouvelle sous-tâche assignée : ${subtask.titre}`,
    lien: `/taches/${subtask.id}`,
    entityType: "Task",
    entityId: subtask.id,
  });
  await runTaskCreatedRules({
    id: subtask.id,
    titre: subtask.titre,
    projectId: subtask.projectId,
    responsablePrincipalId: subtask.responsablePrincipalId,
    priorite: subtask.priorite,
  });

  await recomputeParentTaskFromSubtasks(item.task.id);

  revalidatePath(`/taches/${item.task.id}`);
  revalidatePath("/taches");
  revalidatePath(`/projets/${item.task.projectId}`);

  return {
    id: subtask.id,
    titre: subtask.titre,
    statut: subtask.statut,
    priorite: subtask.priorite,
    responsablePrincipalId: subtask.responsablePrincipalId,
    responsableNom: subtask.responsablePrincipal.name,
    dateDebut: subtask.dateDebut ? subtask.dateDebut.toISOString() : null,
    echeance: subtask.echeance ? subtask.echeance.toISOString() : null,
  };
}

export async function addDependency(taskId: string, dependsOnTaskId: string, type?: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = addDependencySchema.parse({ taskId, dependsOnTaskId, type });

  if (data.taskId === data.dependsOnTaskId) {
    throw new Error("Une tâche ne peut pas dépendre d'elle-même.");
  }

  const dependency = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.taskDependency.create({
      data: {
        taskId: data.taskId,
        dependsOnTaskId: data.dependsOnTaskId,
        type: data.type,
        organizationId: session.user.organizationId,
      },
    })
  );

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

/** Convertit un noeud du WBS (ProjectSection) en tache (Project Studio §15). */
export async function convertSectionToTask(input: ConvertSectionToTaskInput) {
  const session = await requireSession();
  const data = convertSectionToTaskSchema.parse(input);

  const section = await prisma.projectSection.findUniqueOrThrow({ where: { id: data.sectionId } });
  await requireScopedPermission(session.user.permissions, PERMISSIONS.TASK_CREATE, session.user.id, {
    projectId: section.projectId,
  });

  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.create({
      data: {
        projectId: section.projectId,
        sectionId: section.id,
        titre: section.nom,
        description: section.description,
        responsablePrincipalId: section.responsableId ?? session.user.id,
        dateDebut: section.dateDebut ?? undefined,
        echeance: section.dateFin ?? undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "section.converted_to_task",
    entityType: "Task",
    entityId: task.id,
    changes: { sectionId: section.id },
  });

  revalidatePath(`/projets/${section.projectId}`);
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
}

export async function updateActualTime(taskId: string, tempsReelHeures: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const data = updateActualTimeSchema.parse({ taskId, tempsReelHeures });

  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.update({
      where: { id: data.taskId },
      data: { tempsReelHeures: Number(data.tempsReelHeures) },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "task.actual_time_updated",
    entityType: "Task",
    entityId: data.taskId,
    changes: { tempsReelHeures: data.tempsReelHeures },
  });

  revalidatePath(`/taches/${taskId}`);
  revalidatePath("/charge-de-travail");
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
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

  const task = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.task.update({
      where: { id: data.taskId },
      data: { externalContactId: data.externalContactId || null },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: data.externalContactId ? "task.mission_assigned" : "task.mission_unassigned",
    entityType: "Task",
    entityId: task.id,
    changes: { externalContactId: data.externalContactId ?? null },
  });

  revalidatePath(`/taches/${data.taskId}`);
  return { ...task, tempsEstimeHeures: task.tempsEstimeHeures ? Number(task.tempsEstimeHeures) : null, tempsReelHeures: task.tempsReelHeures ? Number(task.tempsReelHeures) : null };
}

const TASK_VIEWS = ["liste", "kanban", "chronologie", "gantt", "mindmap", "portefeuille", "blanc"];

/** Mémorise la vue choisie (cahier des charges §7 : "chaque utilisateur choisit sa vue"). */
export async function setDefaultTaskView(vue: string) {
  const session = await requireSession();
  if (!TASK_VIEWS.includes(vue)) return;

  await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.user.update({
      where: { id: session.user.id },
      data: { defaultTaskView: vue },
    })
  );
}
