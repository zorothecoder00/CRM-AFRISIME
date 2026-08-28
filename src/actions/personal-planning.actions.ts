"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { addDays, addWeeks, addMonths } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { runTaskBlockedRules } from "@/lib/automation";
import { findHolidayOnDate, findApprovedLeaveOnDate } from "@/lib/personal-planning-holidays";
import { findScheduleConflict } from "@/lib/personal-planning-conflicts";
import {
  createPersonalPlanningEntrySchema,
  updatePersonalPlanningEntrySchema,
  deletePersonalPlanningEntrySchema,
  deletePersonalPlanningEntrySeriesSchema,
  scheduleInboxTaskSchema,
  movePersonalPlanningEntrySchema,
  reorganizeOverloadedDaySchema,
  reassignInboxTaskSchema,
  promoteEntryToTaskSchema,
  getAvailabilitySchema,
  createAvailabilityRequestSchema,
  decideAvailabilityRequestSchema,
  cancelAvailabilityRequestSchema,
  MAX_RECURRENCE_OCCURRENCES,
  type CreatePersonalPlanningEntryInput,
  type UpdatePersonalPlanningEntryInput,
  type DeletePersonalPlanningEntryInput,
  type DeletePersonalPlanningEntrySeriesInput,
  type ScheduleInboxTaskInput,
  type MovePersonalPlanningEntryInput,
  type ReorganizeOverloadedDayInput,
  type ReassignInboxTaskInput,
  type PromoteEntryToTaskInput,
  type GetAvailabilityInput,
  type CreateAvailabilityRequestInput,
  type DecideAvailabilityRequestInput,
  type CancelAvailabilityRequestInput,
} from "@/lib/validations/personal-planning.schema";

const PLANNING_PATH = "/planning-personnel";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * §39/§41/§42 — collecte tous les avertissements de planification (jamais
 * bloquants) pour un créneau donné : jour férié, congé approuvé, conflit
 * d'horaire. Un seul appel composite plutôt que trois champs séparés à
 * maintenir côté client.
 */
async function collectPlanningWarnings(userId: string, dateDebut: Date, dateFin: Date, excludeEntryId?: string): Promise<string[]> {
  const [holiday, leave, conflict] = await Promise.all([
    findHolidayOnDate(userId, dateDebut),
    findApprovedLeaveOnDate(userId, dateDebut),
    findScheduleConflict(userId, dateDebut, dateFin, excludeEntryId),
  ]);
  const warnings: string[] = [];
  if (holiday) warnings.push(`Jour férié : ${holiday}.`);
  if (leave) warnings.push(`Cette période chevauche un ${leave}.`);
  if (conflict) warnings.push(`Conflit d'horaire avec : ${conflict}.`);
  return warnings;
}

/** Genere les couples (debut, fin) d'une serie recurrente, meme duree que l'occurrence initiale. */
function computeOccurrences(
  dateDebut: Date,
  dateFin: Date,
  repetition: "AUCUNE" | "QUOTIDIENNE" | "HEBDOMADAIRE" | "MENSUELLE",
  repetitionFin: Date | null
): { dateDebut: Date; dateFin: Date }[] {
  if (repetition === "AUCUNE" || !repetitionFin) return [{ dateDebut, dateFin }];

  const durationMs = dateFin.getTime() - dateDebut.getTime();
  const step = repetition === "QUOTIDIENNE" ? addDays : repetition === "HEBDOMADAIRE" ? addWeeks : addMonths;

  const occurrences: { dateDebut: Date; dateFin: Date }[] = [];
  let cursor = dateDebut;
  while (cursor <= repetitionFin && occurrences.length < MAX_RECURRENCE_OCCURRENCES) {
    occurrences.push({ dateDebut: cursor, dateFin: new Date(cursor.getTime() + durationMs) });
    cursor = step(cursor, 1);
  }
  return occurrences;
}

/** Trouve-ou-cree les Tag par nom puis synchronise les EntityTag d'une entree (meme logique que setEntityTags, sans le controle de permission generique — une entree de planning personnel n'appartient qu'a son proprietaire). */
async function syncEntryTags(entryId: string, tagNames: string[], createdById: string) {
  const names = Array.from(new Set(tagNames.map((n) => n.trim()).filter(Boolean)));

  const tags = await Promise.all(
    names.map((nom) =>
      prisma.tag.upsert({ where: { nom }, update: {}, create: { nom, createdById } })
    )
  );

  const existing = await prisma.entityTag.findMany({ where: { entityType: "PersonalPlanningEntry", entityId: entryId } });
  const existingTagIds = new Set(existing.map((e) => e.tagId));
  const targetTagIds = new Set(tags.map((t) => t.id));
  const toRemove = existing.filter((e) => !targetTagIds.has(e.tagId));
  const toAdd = tags.filter((t) => !existingTagIds.has(t.id));

  await prisma.$transaction([
    ...(toRemove.length > 0 ? [prisma.entityTag.deleteMany({ where: { id: { in: toRemove.map((r) => r.id) } } })] : []),
    ...toAdd.map((t) => prisma.entityTag.create({ data: { tagId: t.id, entityType: "PersonalPlanningEntry", entityId: entryId } })),
  ]);
}

/** Synchronise les participants d'une entree et notifie les nouveaux ajouts. */
async function syncEntryParticipants(entryId: string, participantIds: string[], ownerName: string, entryTitre: string) {
  const ids = Array.from(new Set(participantIds));
  const existing = await prisma.personalPlanningEntryParticipant.findMany({ where: { entryId } });
  const existingIds = new Set(existing.map((p) => p.userId));
  const toRemove = existing.filter((p) => !ids.includes(p.userId));
  const toAdd = ids.filter((id) => !existingIds.has(id));

  if (toRemove.length > 0) {
    await prisma.personalPlanningEntryParticipant.deleteMany({
      where: { entryId, userId: { in: toRemove.map((p) => p.userId) } },
    });
  }
  if (toAdd.length > 0) {
    await prisma.personalPlanningEntryParticipant.createMany({
      data: toAdd.map((userId) => ({ entryId, userId })),
    });
    await Promise.all(
      toAdd.map((userId) =>
        createNotification({
          userId,
          type: "ACTIVITE_INVITATION",
          titre: `${ownerName} vous a ajouté à une activité : ${entryTitre}`,
          lien: PLANNING_PATH,
          entityType: "PersonalPlanningEntry",
          entityId: entryId,
        })
      )
    );
  }
}

export async function createPersonalPlanningEntry(input: CreatePersonalPlanningEntryInput) {
  const session = await requireSession();
  const data = createPersonalPlanningEntrySchema.parse(input);

  const dateDebut = new Date(data.dateDebut);
  const dateFin = new Date(data.dateFin);
  if (dateFin < dateDebut) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }
  const repetitionFin = data.repetitionFin ? new Date(data.repetitionFin) : null;
  if (data.repetition !== "AUCUNE" && repetitionFin && repetitionFin < dateDebut) {
    throw new Error("La date de fin de répétition doit être postérieure à la date de début.");
  }

  const occurrences = computeOccurrences(dateDebut, dateFin, data.repetition, repetitionFin);
  const recurrenceGroupId = occurrences.length > 1 ? randomUUID() : null;

  const commonData = {
    userId: session.user.id,
    titre: data.titre,
    notes: data.notes,
    type: data.type,
    priorite: data.priorite,
    lieu: data.lieu || null,
    projetId: data.projetId || null,
    tacheId: data.tacheId || null,
    objectifId: data.objectifId || null,
    repetition: data.repetition,
    repetitionFin,
    recurrenceGroupId,
    rappels: data.rappels,
    rappelPersonnaliseDate: data.rappelPersonnaliseDate ? new Date(data.rappelPersonnaliseDate) : null,
    piecesJointes: data.piecesJointes,
    missionDestination: data.type === "MISSION" ? data.missionDestination || null : null,
    missionBudget: data.type === "MISSION" && data.missionBudget ? data.missionBudget : null,
    missionMoyenTransport: data.type === "MISSION" ? data.missionMoyenTransport || null : null,
    missionHebergement: data.type === "MISSION" ? data.missionHebergement || null : null,
  };

  const created = await prisma.$transaction(
    occurrences.map((o) =>
      prisma.personalPlanningEntry.create({
        data: { ...commonData, dateDebut: o.dateDebut, dateFin: o.dateFin },
      })
    )
  );

  await Promise.all(
    created.map((entry) =>
      Promise.all([
        data.etiquettes.length > 0 ? syncEntryTags(entry.id, data.etiquettes, session.user.id) : Promise.resolve(),
        data.participantIds.length > 0
          ? syncEntryParticipants(entry.id, data.participantIds, session.user.name ?? "Un collègue", entry.titre)
          : Promise.resolve(),
      ])
    )
  );

  revalidatePath(PLANNING_PATH);
  const first = created[0];
  const warnings = await collectPlanningWarnings(session.user.id, first.dateDebut, first.dateFin, first.id);
  return {
    ...first,
    dateDebut: first.dateDebut.toISOString(),
    dateFin: first.dateFin.toISOString(),
    occurrencesCreated: created.length,
    warnings,
  };
}

export async function updatePersonalPlanningEntry(input: UpdatePersonalPlanningEntryInput) {
  const session = await requireSession();
  const data = updatePersonalPlanningEntrySchema.parse(input);

  const existing = await prisma.personalPlanningEntry.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.userId !== session.user.id) {
    throw new Error("Vous ne pouvez modifier que vos propres entrées de planning.");
  }
  const dateDebut = new Date(data.dateDebut);
  const dateFin = new Date(data.dateFin);
  if (dateFin < dateDebut) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const entry = await prisma.personalPlanningEntry.update({
    where: { id: data.id },
    data: {
      titre: data.titre,
      notes: data.notes,
      dateDebut,
      dateFin,
      type: data.type,
      statut: data.statut,
      motifBlocage: data.statut === "BLOQUEE" ? data.motifBlocage : null,
      priorite: data.priorite,
      lieu: data.lieu || null,
      projetId: data.projetId || null,
      tacheId: data.tacheId || null,
      objectifId: data.objectifId || null,
      repetition: data.repetition,
      repetitionFin: data.repetitionFin ? new Date(data.repetitionFin) : null,
      rappels: data.rappels,
      rappelPersonnaliseDate: data.rappelPersonnaliseDate ? new Date(data.rappelPersonnaliseDate) : null,
      piecesJointes: data.piecesJointes,
      missionDestination: data.type === "MISSION" ? data.missionDestination || null : null,
      missionBudget: data.type === "MISSION" && data.missionBudget ? data.missionBudget : null,
      missionMoyenTransport: data.type === "MISSION" ? data.missionMoyenTransport || null : null,
      missionHebergement: data.type === "MISSION" ? data.missionHebergement || null : null,
      missionRapport: data.type === "MISSION" ? data.missionRapport || null : null,
    },
  });

  await Promise.all([
    syncEntryTags(entry.id, data.etiquettes, session.user.id),
    syncEntryParticipants(entry.id, data.participantIds, session.user.name ?? "Un collègue", entry.titre),
  ]);

  // §47 — historique/traçabilité : ne journalise que si un champ suivi a
  // réellement changé, pour ne pas noyer l'historique d'une entrée dans des
  // entrées vides (ex. modification des seules pièces jointes).
  if (existing.statut !== entry.statut || existing.priorite !== entry.priorite || existing.dateDebut.getTime() !== entry.dateDebut.getTime()) {
    await logAudit({
      userId: session.user.id,
      action: "personal_planning_entry.updated",
      entityType: "PersonalPlanningEntry",
      entityId: entry.id,
      changes: {
        statut: existing.statut !== entry.statut ? { avant: existing.statut, apres: entry.statut } : undefined,
        priorite: existing.priorite !== entry.priorite ? { avant: existing.priorite, apres: entry.priorite } : undefined,
        dateDebut:
          existing.dateDebut.getTime() !== entry.dateDebut.getTime()
            ? { avant: existing.dateDebut.toISOString(), apres: entry.dateDebut.toISOString() }
            : undefined,
      },
    });
  }

  // §33/§34 — une activité liée à une Tâche qui passe à BLOQUEE répercute le
  // statut sur la Tâche elle-même (comme l'échéance au §14), ce qui
  // déclenche runTaskBlockedRules côté moteur d'automatisation partagé.
  if (entry.tacheId && data.statut === "BLOQUEE" && existing.statut !== "BLOQUEE") {
    const task = await prisma.task.update({
      where: { id: entry.tacheId },
      data: { statut: "BLOQUEE" },
      select: { id: true, titre: true, projectId: true, responsablePrincipalId: true, priorite: true },
    });
    if (task.priorite === "TRES_HAUTE") {
      await runTaskBlockedRules(task);
    }
  }

  revalidatePath(PLANNING_PATH);
  return { ...entry, dateDebut: entry.dateDebut.toISOString(), dateFin: entry.dateFin.toISOString() };
}

export async function deletePersonalPlanningEntry(input: DeletePersonalPlanningEntryInput) {
  const session = await requireSession();
  const data = deletePersonalPlanningEntrySchema.parse(input);

  const existing = await prisma.personalPlanningEntry.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.userId !== session.user.id) {
    throw new Error("Vous ne pouvez supprimer que vos propres entrées de planning.");
  }

  await prisma.personalPlanningEntry.delete({ where: { id: data.id } });

  revalidatePath(PLANNING_PATH);
  return { id: data.id };
}

/** Supprime toutes les occurrences futures d'une serie recurrente (voir §9 repetition). */
export async function deletePersonalPlanningEntrySeries(input: DeletePersonalPlanningEntrySeriesInput) {
  const session = await requireSession();
  const data = deletePersonalPlanningEntrySeriesSchema.parse(input);

  const { count } = await prisma.personalPlanningEntry.deleteMany({
    where: { recurrenceGroupId: data.recurrenceGroupId, userId: session.user.id, dateDebut: { gte: new Date() } },
  });

  revalidatePath(PLANNING_PATH);
  return { count };
}

/**
 * Déplace une entrée à une nouvelle date/heure de début en conservant sa
 * durée d'origine (§14 drag & drop) — et, si elle planifie une Tâche
 * (tacheId), répercute la nouvelle date de fin sur `Task.echeance` : c'est
 * le principe §4 "une tâche, plusieurs vues", l'activité EST la vue
 * planifiée de la tâche.
 */
async function moveEntryToDate(tx: Prisma.TransactionClient, entryId: string, newDateDebut: Date) {
  const existing = await tx.personalPlanningEntry.findUniqueOrThrow({ where: { id: entryId } });
  const durationMs = existing.dateFin.getTime() - existing.dateDebut.getTime();
  const newDateFin = new Date(newDateDebut.getTime() + durationMs);

  const updated = await tx.personalPlanningEntry.update({
    where: { id: entryId },
    data: { dateDebut: newDateDebut, dateFin: newDateFin },
  });

  if (existing.tacheId) {
    await tx.task.update({ where: { id: existing.tacheId }, data: { echeance: newDateFin } });
  }

  return updated;
}

/**
 * §41 — quand un congé est approuvé, les activités déjà programmées pendant
 * la période sont déplacées juste après (heure/durée conservées), comme un
 * "reporter" ciblé (même mécanique que moveEntryToDate/reorganizeOverloadedDay).
 * Notifie l'approbateur uniquement si au moins une activité a dû bouger —
 * "Alerte manager si nécessaire" du §41, pas un bruit systématique.
 */
export async function reorganizeEntriesForApprovedLeave(
  leaveId: string,
  userId: string,
  leaveDateDebut: Date,
  leaveDateFin: Date,
  approverId: string
) {
  const overlapping = await prisma.personalPlanningEntry.findMany({
    where: {
      userId,
      type: { not: "RESERVE" },
      statut: { notIn: ["TERMINEE", "ANNULEE"] },
      dateDebut: { lt: leaveDateFin },
      dateFin: { gt: leaveDateDebut },
    },
    select: { id: true, titre: true, dateDebut: true },
  });

  if (overlapping.length === 0) return { moved: 0 };

  await prisma.$transaction(async (tx) => {
    for (const entry of overlapping) {
      const newDateDebut = new Date(leaveDateFin);
      newDateDebut.setDate(newDateDebut.getDate() + 1);
      newDateDebut.setHours(entry.dateDebut.getHours(), entry.dateDebut.getMinutes(), 0, 0);
      await moveEntryToDate(tx, entry.id, newDateDebut);
    }
  });

  await createNotification({
    userId: approverId,
    type: "CONGE_REORGANISATION",
    titre: `${overlapping.length} activité(s) reprogrammée(s) suite à un congé approuvé.`,
    lien: PLANNING_PATH,
    entityType: "Leave",
    entityId: leaveId,
  });

  return { moved: overlapping.length };
}

/** §13/§14 : planifie une Tâche de l'inbox "À planifier" en créant l'Activité qui la planifie. */
export async function scheduleInboxTask(input: ScheduleInboxTaskInput) {
  const session = await requireSession();
  const data = scheduleInboxTaskSchema.parse(input);

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: data.taskId },
    select: { id: true, titre: true, responsablePrincipalId: true, assignees: { select: { userId: true } } },
  });
  const isOwner = task.responsablePrincipalId === session.user.id || task.assignees.some((a) => a.userId === session.user.id);
  if (!isOwner) {
    throw new Error("Vous ne pouvez planifier que vos propres tâches.");
  }

  const dateDebut = new Date(data.dateDebut);
  const dateFin = new Date(dateDebut.getTime() + data.dureeMinutes * 60_000);

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.personalPlanningEntry.create({
      data: { userId: session.user.id, titre: task.titre, type: "TACHE", tacheId: task.id, dateDebut, dateFin },
    });
    await tx.task.update({ where: { id: task.id }, data: { echeance: dateFin } });
    return created;
  });

  revalidatePath(PLANNING_PATH);
  const warnings = await collectPlanningWarnings(session.user.id, entry.dateDebut, entry.dateFin, entry.id);
  return { ...entry, dateDebut: entry.dateDebut.toISOString(), dateFin: entry.dateFin.toISOString(), warnings };
}

/** §29 : réaffecte une tâche de l'inbox "À planifier" à un autre collaborateur. */
export async function reassignInboxTask(input: ReassignInboxTaskInput) {
  const session = await requireSession();
  const data = reassignInboxTaskSchema.parse(input);
  requirePermission(session.user.permissions, PERMISSIONS.TASK_UPDATE);

  const before = await prisma.task.findUniqueOrThrow({ where: { id: data.taskId }, select: { responsablePrincipalId: true } });

  const task = await prisma.task.update({
    where: { id: data.taskId },
    data: { responsablePrincipalId: data.newResponsableId },
  });

  // §47 — ex. document : « Responsable a réassigné la tâche. »
  await logAudit({
    userId: session.user.id,
    action: "task.reassigned_from_inbox",
    entityType: "Task",
    entityId: task.id,
    changes: { responsablePrincipalId: { avant: before.responsablePrincipalId, apres: data.newResponsableId } },
  });

  await createNotification({
    userId: data.newResponsableId,
    type: "NOUVELLE_TACHE",
    titre: `Tâche réaffectée : ${task.titre}`,
    lien: `/taches/${task.id}`,
    entityType: "Task",
    entityId: task.id,
  });

  revalidatePath(PLANNING_PATH);
  revalidatePath("/taches");
  return { id: task.id };
}

const ENTRY_TO_TASK_PRIORITY: Record<string, "TRES_HAUTE" | "HAUTE" | "MOYENNE" | "BASSE"> = {
  CRITIQUE: "TRES_HAUTE",
  HAUTE: "HAUTE",
  NORMALE: "MOYENNE",
  FAIBLE: "BASSE",
};

/** §29/§30 : transforme une activité de capture rapide (sans tacheId) en vraie Tâche dans un projet. */
export async function promoteEntryToTask(input: PromoteEntryToTaskInput) {
  const session = await requireSession();
  const data = promoteEntryToTaskSchema.parse(input);

  const entry = await prisma.personalPlanningEntry.findUniqueOrThrow({ where: { id: data.entryId } });
  if (entry.userId !== session.user.id) {
    throw new Error("Vous ne pouvez transformer que vos propres activités.");
  }
  if (entry.tacheId) {
    throw new Error("Cette activité est déjà liée à une tâche.");
  }

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId: data.projectId,
        titre: entry.titre,
        priorite: ENTRY_TO_TASK_PRIORITY[entry.priorite] ?? "MOYENNE",
        dateDebut: entry.dateDebut,
        echeance: entry.dateFin,
        responsablePrincipalId: session.user.id,
        createdById: session.user.id,
      },
    });
    await tx.personalPlanningEntry.update({ where: { id: entry.id }, data: { tacheId: created.id, projetId: data.projectId } });
    return created;
  });

  // §47 — traçabilité de la transformation capture rapide → tâche de projet.
  await logAudit({
    userId: session.user.id,
    action: "personal_planning_entry.promoted_to_task",
    entityType: "PersonalPlanningEntry",
    entityId: entry.id,
    changes: { taskId: task.id, projectId: data.projectId },
  });

  revalidatePath(PLANNING_PATH);
  revalidatePath("/taches");
  return { id: task.id };
}

/** §14 : déplace une entrée déjà planifiée vers un autre jour/heure (drag & drop sur le calendrier). */
export async function movePersonalPlanningEntry(input: MovePersonalPlanningEntryInput) {
  const session = await requireSession();
  const data = movePersonalPlanningEntrySchema.parse(input);

  const existing = await prisma.personalPlanningEntry.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.userId !== session.user.id) {
    throw new Error("Vous ne pouvez déplacer que vos propres entrées de planning.");
  }
  if (existing.type === "RESERVE") {
    throw new Error("Un créneau réservé via une demande de collègue ne peut pas être déplacé ici.");
  }

  const entry = await prisma.$transaction((tx) => moveEntryToDate(tx, data.id, new Date(data.newDateDebut)));

  // §47 — ex. document : « Kossi a déplacé la tâche du 27/08 au 28/08. »
  await logAudit({
    userId: session.user.id,
    action: "personal_planning_entry.moved",
    entityType: "PersonalPlanningEntry",
    entityId: entry.id,
    changes: { dateDebut: { avant: existing.dateDebut.toISOString(), apres: entry.dateDebut.toISOString() } },
  });

  revalidatePath(PLANNING_PATH);
  const warnings = await collectPlanningWarnings(session.user.id, entry.dateDebut, entry.dateFin, entry.id);
  return { ...entry, dateDebut: entry.dateDebut.toISOString(), dateFin: entry.dateFin.toISOString(), warnings };
}

const NON_CRITICAL_PRIORITIES = ["FAIBLE", "NORMALE", "HAUTE"] as const;
const REORGANIZE_MAX_SPREAD_DAYS = 7;

/**
 * §16 (version légère, sans moteur IA) : quand une journée est en
 * surcharge, propose deux actions concrètes plutôt qu'une suggestion IA —
 * "Reporter" pousse tout ce qui n'est pas critique à demain ; "Étaler"
 * répartit les entrées non critiques (les moins prioritaires d'abord) sur
 * les jours suivants, un jour à la fois, jusqu'à repasser sous 100 %.
 */
export async function reorganizeOverloadedDay(input: ReorganizeOverloadedDayInput) {
  const session = await requireSession();
  const data = reorganizeOverloadedDaySchema.parse(input);

  const dayStart = new Date(data.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { capaciteHebdomadaireHeures: true },
  });
  const capaciteHeures = Number(user.capaciteHebdomadaireHeures) / 5;

  const dayEntries = await prisma.personalPlanningEntry.findMany({
    where: {
      userId: session.user.id,
      type: { not: "RESERVE" },
      priorite: { in: [...NON_CRITICAL_PRIORITIES] },
      dateDebut: { gte: dayStart, lte: dayEnd },
    },
    orderBy: [{ priorite: "asc" }, { dateDebut: "asc" }],
  });

  let moved = 0;

  if (data.strategy === "REPORTER") {
    await prisma.$transaction(async (tx) => {
      for (const e of dayEntries) {
        await moveEntryToDate(tx, e.id, addDays(e.dateDebut, 1));
        moved += 1;
      }
    });
  } else {
    // ETALER — priorité ascendante (FAIBLE avant NORMALE avant HAUTE) : les
    // moins prioritaires bougent en premier, un jour d'écart supplémentaire
    // par entrée déplacée, jusqu'au plafond REORGANIZE_MAX_SPREAD_DAYS.
    const priorityRank: Record<string, number> = { FAIBLE: 0, NORMALE: 1, HAUTE: 2, CRITIQUE: 3 };
    const ordered = [...dayEntries].sort((a, b) => priorityRank[a.priorite] - priorityRank[b.priorite]);

    let remainingHeures = ordered.reduce((sum, e) => sum + (e.dateFin.getTime() - e.dateDebut.getTime()) / 3_600_000, 0);
    let dayOffset = 1;

    await prisma.$transaction(async (tx) => {
      for (const e of ordered) {
        if (remainingHeures <= capaciteHeures || dayOffset > REORGANIZE_MAX_SPREAD_DAYS) break;
        await moveEntryToDate(tx, e.id, addDays(e.dateDebut, dayOffset));
        moved += 1;
        remainingHeures -= (e.dateFin.getTime() - e.dateDebut.getTime()) / 3_600_000;
        dayOffset += 1;
      }
    });
  }

  revalidatePath(PLANNING_PATH);
  return { moved };
}

/**
 * Disponibilité d'un collègue (Planning personnel) : ne renvoie que des
 * plages "occupé", jamais le titre/contenu de ses notes — seule la plage
 * horaire de PersonalPlanningEntry est utilisée, croisée avec ses réunions
 * (participant) et ses congés approuvés pour que le signal reste fiable.
 */
export async function getUserAvailability(input: GetAvailabilityInput) {
  await requireSession();
  const data = getAvailabilitySchema.parse(input);
  const dateDebut = new Date(data.dateDebut);
  const dateFin = new Date(data.dateFin);

  const [entries, meetings, leaves] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId: data.userId, dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } },
      select: { dateDebut: true, dateFin: true },
    }),
    prisma.meeting.findMany({
      where: {
        participants: { some: { userId: data.userId } },
        dateHeure: { gte: dateDebut, lte: dateFin },
      },
      select: { dateHeure: true },
    }),
    prisma.leave.findMany({
      where: { userId: data.userId, statut: "APPROUVE", dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } },
      select: { dateDebut: true, dateFin: true },
    }),
  ]);

  const busy = [
    ...entries.map((e) => ({ dateDebut: e.dateDebut.toISOString(), dateFin: e.dateFin.toISOString(), source: "personnel" as const })),
    ...meetings.map((m) => ({ dateDebut: m.dateHeure.toISOString(), dateFin: m.dateHeure.toISOString(), source: "reunion" as const })),
    ...leaves.map((l) => ({ dateDebut: l.dateDebut.toISOString(), dateFin: l.dateFin.toISOString(), source: "conge" as const })),
  ].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  return busy;
}

export async function createAvailabilityRequest(input: CreateAvailabilityRequestInput) {
  const session = await requireSession();
  const data = createAvailabilityRequestSchema.parse(input);

  if (data.targetUserId === session.user.id) {
    throw new Error("Vous ne pouvez pas faire de demande sur votre propre planning.");
  }
  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const request = await prisma.availabilityRequest.create({
    data: {
      targetUserId: data.targetUserId,
      requestedById: session.user.id,
      titre: data.titre,
      message: data.message,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "availability_request.created",
    entityType: "AvailabilityRequest",
    entityId: request.id,
    changes: { targetUserId: data.targetUserId, titre: data.titre },
  });

  await createNotification({
    userId: data.targetUserId,
    type: "DEMANDE_DISPONIBILITE",
    titre: `${session.user.name} vous propose un créneau : ${data.titre}`,
    lien: PLANNING_PATH,
    entityType: "AvailabilityRequest",
    entityId: request.id,
  });

  revalidatePath(PLANNING_PATH);
  return { ...request, dateDebut: request.dateDebut.toISOString(), dateFin: request.dateFin.toISOString() };
}

export async function decideAvailabilityRequest(input: DecideAvailabilityRequestInput) {
  const session = await requireSession();
  const data = decideAvailabilityRequestSchema.parse(input);

  const existing = await prisma.availabilityRequest.findUniqueOrThrow({ where: { id: data.requestId } });
  if (existing.targetUserId !== session.user.id) {
    throw new Error("Seul le destinataire peut répondre à cette demande.");
  }
  if (existing.statut !== "EN_ATTENTE") {
    throw new Error("Cette demande a déjà été traitée.");
  }

  const request = await prisma.$transaction(async (tx) => {
    const updated = await tx.availabilityRequest.update({
      where: { id: data.requestId },
      data: {
        statut: data.statut,
        decidedAt: new Date(),
        motifRefus: data.statut === "REFUSEE" ? data.motifRefus || undefined : null,
      },
    });

    if (data.statut === "ACCEPTEE") {
      await tx.personalPlanningEntry.create({
        data: {
          userId: existing.targetUserId,
          titre: existing.titre,
          notes: existing.message,
          dateDebut: existing.dateDebut,
          dateFin: existing.dateFin,
          type: "RESERVE",
          originRequestId: existing.id,
        },
      });
    }

    return updated;
  });

  await logAudit({
    userId: session.user.id,
    action: "availability_request.decided",
    entityType: "AvailabilityRequest",
    entityId: request.id,
    changes: { statut: data.statut },
  });

  await createNotification({
    userId: existing.requestedById,
    type: "DEMANDE_DISPONIBILITE_DECISION",
    titre:
      data.statut === "ACCEPTEE"
        ? `${session.user.name} a accepté votre demande : ${existing.titre}`
        : `${session.user.name} a refusé votre demande : ${existing.titre}`,
    lien: PLANNING_PATH,
    entityType: "AvailabilityRequest",
    entityId: request.id,
  });

  revalidatePath(PLANNING_PATH);
  return { ...request, dateDebut: request.dateDebut.toISOString(), dateFin: request.dateFin.toISOString() };
}

export async function cancelAvailabilityRequest(input: CancelAvailabilityRequestInput) {
  const session = await requireSession();
  const data = cancelAvailabilityRequestSchema.parse(input);

  const existing = await prisma.availabilityRequest.findUniqueOrThrow({ where: { id: data.requestId } });
  if (existing.requestedById !== session.user.id) {
    throw new Error("Vous ne pouvez annuler que vos propres demandes.");
  }
  if (existing.statut !== "EN_ATTENTE") {
    throw new Error("Cette demande a déjà été traitée.");
  }

  const request = await prisma.availabilityRequest.update({
    where: { id: data.requestId },
    data: { statut: "ANNULEE", decidedAt: new Date() },
  });

  revalidatePath(PLANNING_PATH);
  return { ...request, dateDebut: request.dateDebut.toISOString(), dateFin: request.dateFin.toISOString() };
}

/**
 * §47 — historique d'une entrée, chargé à la demande (pas au chargement de
 * `/planning-personnel`, qui listerait sinon une requête AuditLog par
 * entrée affichée) : appelé uniquement quand la section "Historique" est
 * dépliée dans le dialogue d'édition.
 */
export async function getPersonalPlanningEntryHistory(entryId: string) {
  const session = await requireSession();
  const existing = await prisma.personalPlanningEntry.findUniqueOrThrow({ where: { id: entryId }, select: { userId: true } });
  if (existing.userId !== session.user.id) {
    throw new Error("Vous ne pouvez consulter que l'historique de vos propres entrées.");
  }

  const logs = await prisma.auditLog.findMany({
    where: { entityType: "PersonalPlanningEntry", entityId: entryId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    authorName: log.user?.name ?? null,
    createdAt: log.createdAt.toISOString(),
    changes: log.changes,
  }));
}
