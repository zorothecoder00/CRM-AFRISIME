"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { addDays, addWeeks, addMonths } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { createNotification, notifyMany } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { runTaskBlockedRules } from "@/lib/automation";
import { findHolidayOnDate, findApprovedLeaveOnDate, assertNotOnNonWorkingDay } from "@/lib/personal-planning-holidays";
import { findScheduleConflict } from "@/lib/personal-planning-conflicts";
import { moveEntryToDate } from "@/lib/personal-planning-move";
import {
  createPersonalPlanningEntrySchema,
  updatePersonalPlanningEntrySchema,
  deletePersonalPlanningEntrySchema,
  deletePersonalPlanningEntrySeriesSchema,
  scheduleInboxTaskSchema,
  movePersonalPlanningEntrySchema,
  reorganizeOverloadedDaySchema,
  requestTaskReassignmentSchema,
  reassignInboxTaskSchema,
  promoteEntryToTaskSchema,
  getAvailabilitySchema,
  createAvailabilityRequestSchema,
  decideAvailabilityRequestSchema,
  cancelAvailabilityRequestSchema,
  saveDailyReviewNotesSchema,
  MAX_RECURRENCE_OCCURRENCES,
  type CreatePersonalPlanningEntryInput,
  type UpdatePersonalPlanningEntryInput,
  type DeletePersonalPlanningEntryInput,
  type DeletePersonalPlanningEntrySeriesInput,
  type ScheduleInboxTaskInput,
  type MovePersonalPlanningEntryInput,
  type ReorganizeOverloadedDayInput,
  type RequestTaskReassignmentInput,
  type ReassignInboxTaskInput,
  type PromoteEntryToTaskInput,
  type GetAvailabilityInput,
  type CreateAvailabilityRequestInput,
  type DecideAvailabilityRequestInput,
  type CancelAvailabilityRequestInput,
  type SaveDailyReviewNotesInput,
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
  if (conflict) warnings.push(`Conflit d'horaire avec : ${conflict.titre}.`);
  return warnings;
}

/**
 * "Toutes activités ou tâches créées doivent notifier les concernés que la
 * plage de disponibilité de cet utilisateur a été modifiée" — notifie le
 * responsable et les autres assignés d'une Tâche (hors l'acteur) quand un
 * créneau vient d'être posé dessus, via `scheduleInboxTask`,
 * `createPersonalPlanningEntry` (avec `tacheId`) ou `movePersonalPlanningEntry`.
 */
async function notifyTaskColleaguesOfSchedule(tacheId: string, actorId: string, actorName: string, dateDebut: Date) {
  const task = await prisma.task.findUnique({
    where: { id: tacheId },
    select: { titre: true, responsablePrincipalId: true, assignees: { select: { userId: true } } },
  });
  if (!task) return;

  const targets = [task.responsablePrincipalId, ...task.assignees.map((a) => a.userId)];
  const dateLabel = dateDebut.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

  await notifyMany(targets, actorId, {
    type: "DISPONIBILITE_MODIFIEE",
    titre: `${actorName} a planifié un créneau (${dateLabel}) sur la tâche : ${task.titre}`,
    lien: `/taches/${tacheId}`,
    entityType: "Task",
    entityId: tacheId,
  });
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

  // §39 — bloque réellement (contrairement aux avertissements ci-dessous)
  // les types "travail" un jour férié/non ouvré ; vérifie chaque occurrence
  // d'une série récurrente, pas seulement la première.
  for (const o of occurrences) {
    await assertNotOnNonWorkingDay(session.user.id, o.dateDebut, data.type);
  }

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

  // §15 (cahier de corrections UI/UX) — un lieu + un temps de trajet
  // réservent automatiquement un bloc "Déplacement" juste avant l'activité,
  // une occurrence par occurrence créée (y compris pour une série
  // récurrente). Volontairement un bloc indépendant (pas de lien formel vers
  // l'activité) : plus simple, cohérent avec le fait que ce module ne
  // maintient déjà aucun lien de ce type entre entrées.
  if (data.lieu && data.dureeTrajetMinutes && data.dureeTrajetMinutes > 0) {
    const dureeMs = data.dureeTrajetMinutes * 60_000;
    await prisma.personalPlanningEntry.createMany({
      data: occurrences.map((o) => ({
        userId: session.user.id,
        titre: `🚗 Déplacement vers ${data.lieu}`,
        type: "DEPLACEMENT" as const,
        priorite: data.priorite,
        lieu: data.lieu,
        dateDebut: new Date(o.dateDebut.getTime() - dureeMs),
        dateFin: o.dateDebut,
      })),
    });
  }

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

  if (data.tacheId) {
    await notifyTaskColleaguesOfSchedule(data.tacheId, session.user.id, session.user.name ?? "Un collègue", dateDebut);
  }

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
  const first = created[0];
  const warnings = await collectPlanningWarnings(session.user.id, first.dateDebut, first.dateFin, first.id);
  return {
    ...first,
    dateDebut: first.dateDebut.toISOString(),
    dateFin: first.dateFin.toISOString(),
    // §26bis — missionBudget est un Decimal Prisma : non serialisable tel quel
    // vers un Client Component (voir memoire "Decimal serialization").
    missionBudget: first.missionBudget ? first.missionBudget.toString() : null,
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

  // §39 — ne re-vérifie que si la date ou le type a réellement changé (une
  // activité déjà planifiée un jour férié reste modifiable sur d'autres
  // champs sans se faire bloquer rétroactivement par sa propre date).
  if (dateDebut.getTime() !== existing.dateDebut.getTime() || data.type !== existing.type) {
    await assertNotOnNonWorkingDay(session.user.id, dateDebut, data.type);
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
  // entrées vides (ex. modification des seules pièces jointes). dateFin
  // (échéance) suivie au même titre que dateDebut — cf. l'exemple du cahier
  // "Ama a changé l'échéance", auparavant invisible dans cet historique.
  if (
    existing.statut !== entry.statut ||
    existing.priorite !== entry.priorite ||
    existing.dateDebut.getTime() !== entry.dateDebut.getTime() ||
    existing.dateFin.getTime() !== entry.dateFin.getTime()
  ) {
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
        dateFin:
          existing.dateFin.getTime() !== entry.dateFin.getTime()
            ? { avant: existing.dateFin.toISOString(), apres: entry.dateFin.toISOString() }
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

  // Notification directe et systématique au changement de statut, pour les
  // participants de l'activité et — si elle planifie une Tâche existante —
  // le responsable/les assignés de cette tâche.
  if (existing.statut !== entry.statut) {
    const [participants, linkedTask] = await Promise.all([
      prisma.personalPlanningEntryParticipant.findMany({ where: { entryId: entry.id }, select: { userId: true } }),
      entry.tacheId
        ? prisma.task.findUnique({ where: { id: entry.tacheId }, select: { responsablePrincipalId: true, assignees: { select: { userId: true } } } })
        : Promise.resolve(null),
    ]);
    const targets = [
      ...participants.map((p) => p.userId),
      ...(linkedTask ? [linkedTask.responsablePrincipalId, ...linkedTask.assignees.map((a) => a.userId)] : []),
    ];
    if (targets.length > 0) {
      await notifyMany(targets, session.user.id, {
        type: "STATUT_MODIFIE",
        titre: `${session.user.name ?? "Un collègue"} a changé le statut de « ${entry.titre} » → ${entry.statut}`,
        lien: PLANNING_PATH,
        entityType: "PersonalPlanningEntry",
        entityId: entry.id,
      });
    }
  }

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
  return {
    ...entry,
    dateDebut: entry.dateDebut.toISOString(),
    dateFin: entry.dateFin.toISOString(),
    missionBudget: entry.missionBudget ? entry.missionBudget.toString() : null,
  };
}

export async function deletePersonalPlanningEntry(input: DeletePersonalPlanningEntryInput) {
  const session = await requireSession();
  const data = deletePersonalPlanningEntrySchema.parse(input);

  const existing = await prisma.personalPlanningEntry.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.userId !== session.user.id) {
    throw new Error("Vous ne pouvez supprimer que vos propres entrées de planning.");
  }

  await prisma.personalPlanningEntry.delete({ where: { id: data.id } });

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
  return { id: data.id };
}

/** Supprime toutes les occurrences futures d'une serie recurrente (voir §9 repetition). */
export async function deletePersonalPlanningEntrySeries(input: DeletePersonalPlanningEntrySeriesInput) {
  const session = await requireSession();
  const data = deletePersonalPlanningEntrySeriesSchema.parse(input);

  const { count } = await prisma.personalPlanningEntry.deleteMany({
    where: { recurrenceGroupId: data.recurrenceGroupId, userId: session.user.id, dateDebut: { gte: new Date() } },
  });

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
  return { count };
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

  await assertNotOnNonWorkingDay(session.user.id, dateDebut, "TACHE");

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.personalPlanningEntry.create({
      data: { userId: session.user.id, titre: task.titre, type: "TACHE", tacheId: task.id, dateDebut, dateFin },
    });
    await tx.task.update({ where: { id: task.id }, data: { echeance: dateFin } });
    return created;
  });

  await notifyTaskColleaguesOfSchedule(task.id, session.user.id, session.user.name ?? "Un collègue", dateDebut);

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
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

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
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

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
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

  await assertNotOnNonWorkingDay(session.user.id, new Date(data.newDateDebut), existing.type);

  const entry = await prisma.$transaction((tx) => moveEntryToDate(tx, data.id, new Date(data.newDateDebut)));

  // §47 — ex. document : « Kossi a déplacé la tâche du 27/08 au 28/08. »
  await logAudit({
    userId: session.user.id,
    action: "personal_planning_entry.moved",
    entityType: "PersonalPlanningEntry",
    entityId: entry.id,
    changes: { dateDebut: { avant: existing.dateDebut.toISOString(), apres: entry.dateDebut.toISOString() } },
  });

  if (entry.tacheId) {
    await notifyTaskColleaguesOfSchedule(entry.tacheId, session.user.id, session.user.name ?? "Un collègue", entry.dateDebut);
  }

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
  const warnings = await collectPlanningWarnings(session.user.id, entry.dateDebut, entry.dateFin, entry.id);
  return { ...entry, dateDebut: entry.dateDebut.toISOString(), dateFin: entry.dateFin.toISOString(), warnings };
}

const NON_CRITICAL_PRIORITIES = ["FAIBLE", "NORMALE", "HAUTE"] as const;
const REORGANIZE_MAX_SPREAD_DAYS = 7;
const REDUIRE_FACTOR = 0.75;
const REDUIRE_MIN_MINUTES = 15;

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
  // §47 — la réorganisation par surcharge peut déplacer/raccourcir plusieurs
  // activités d'un coup ; chacune reçoit sa propre entrée d'historique
  // (mêmes champs qu'un déplacement manuel), journalisée après coup une fois
  // la transaction validée, plutôt que dans le transaction.
  const auditRecords: { entryId: string; changes: Prisma.InputJsonValue }[] = [];

  if (data.strategy === "REPORTER") {
    await prisma.$transaction(async (tx) => {
      for (const e of dayEntries) {
        const newDateDebut = addDays(e.dateDebut, 1);
        await moveEntryToDate(tx, e.id, newDateDebut);
        auditRecords.push({
          entryId: e.id,
          changes: { strategy: data.strategy, dateDebut: { avant: e.dateDebut.toISOString(), apres: newDateDebut.toISOString() } },
        });
        moved += 1;
      }
    });
  } else if (data.strategy === "REDUIRE") {
    // §16 option 3 — "réduire le temps réservé" : raccourcit la durée des
    // entrées non critiques (les moins prioritaires d'abord), -25 % arrondi
    // au multiple de 5 min le plus proche, jamais sous REDUIRE_MIN_MINUTES.
    // La tâche liée (si applicable) suit sur son échéance, même logique que
    // moveEntryToDate.
    const priorityRank: Record<string, number> = { FAIBLE: 0, NORMALE: 1, HAUTE: 2, CRITIQUE: 3 };
    const ordered = [...dayEntries].sort((a, b) => priorityRank[a.priorite] - priorityRank[b.priorite]);
    let remainingHeures = ordered.reduce((sum, e) => sum + (e.dateFin.getTime() - e.dateDebut.getTime()) / 3_600_000, 0);

    await prisma.$transaction(async (tx) => {
      for (const e of ordered) {
        if (remainingHeures <= capaciteHeures) break;
        const currentMinutes = (e.dateFin.getTime() - e.dateDebut.getTime()) / 60_000;
        const newMinutes = Math.max(REDUIRE_MIN_MINUTES, Math.round((currentMinutes * REDUIRE_FACTOR) / 5) * 5);
        if (newMinutes >= currentMinutes) continue;
        const newDateFin = new Date(e.dateDebut.getTime() + newMinutes * 60_000);
        await tx.personalPlanningEntry.update({ where: { id: e.id }, data: { dateFin: newDateFin } });
        if (e.tacheId) {
          await tx.task.update({ where: { id: e.tacheId }, data: { echeance: newDateFin } });
        }
        auditRecords.push({
          entryId: e.id,
          changes: { strategy: data.strategy, dateFin: { avant: e.dateFin.toISOString(), apres: newDateFin.toISOString() } },
        });
        moved += 1;
        remainingHeures -= (currentMinutes - newMinutes) / 60;
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
        const newDateDebut = addDays(e.dateDebut, dayOffset);
        await moveEntryToDate(tx, e.id, newDateDebut);
        auditRecords.push({
          entryId: e.id,
          changes: { strategy: data.strategy, dateDebut: { avant: e.dateDebut.toISOString(), apres: newDateDebut.toISOString() } },
        });
        moved += 1;
        remainingHeures -= (e.dateFin.getTime() - e.dateDebut.getTime()) / 3_600_000;
        dayOffset += 1;
      }
    });
  }

  await Promise.all(
    auditRecords.map((r) =>
      logAudit({
        userId: session.user.id,
        action: "personal_planning_entry.reorganized",
        entityType: "PersonalPlanningEntry",
        entityId: r.entryId,
        changes: r.changes,
      })
    )
  );

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
  return { moved };
}

/**
 * §16 option 4 — "demander une réaffectation" : envoie une simple demande
 * au collègue choisi (une notification liée à la tâche), ne réaffecte rien
 * automatiquement — la décision reste entre les mains du destinataire (ou
 * de son manager), même principe que partout ailleurs dans ce module où
 * une action sensible ne doit jamais se faire sans validation humaine côté
 * receveur.
 */
export async function requestTaskReassignment(input: RequestTaskReassignmentInput) {
  const session = await requireSession();
  const data = requestTaskReassignmentSchema.parse(input);

  const entry = await prisma.personalPlanningEntry.findUniqueOrThrow({
    where: { id: data.entryId },
    include: { tache: { select: { id: true, titre: true } } },
  });
  if (entry.userId !== session.user.id) {
    throw new Error("Vous ne pouvez demander une réaffectation que pour vos propres activités.");
  }
  if (!entry.tacheId || !entry.tache) {
    throw new Error("Cette activité n'est pas liée à une tâche.");
  }

  await createNotification({
    userId: data.targetUserId,
    type: "DEMANDE_REAFFECTATION_TACHE",
    titre: `${session.user.name ?? "Un collègue"} vous propose de reprendre la tâche « ${entry.tache.titre} » (surcharge de planning).`,
    lien: `/taches/${entry.tache.id}`,
    entityType: "Task",
    entityId: entry.tache.id,
  });

  return { ok: true };
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

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
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

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
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

  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (recurrences, missions, bilans, demandes...) — sans ça, ces
  // sous-pages restaient périmées après une action déclenchée ailleurs
  // (ex. créer une activité depuis /planning-personnel/recurrences).
  revalidatePath(PLANNING_PATH, "layout");
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

function truncateToDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** §22 — sauvegarde (upsert) les notes personnelles du bilan de fin de journée pour une date donnée. */
export async function saveDailyReviewNotes(input: SaveDailyReviewNotesInput) {
  const session = await requireSession();
  const data = saveDailyReviewNotesSchema.parse(input);
  const date = truncateToDay(data.date);

  const review = await prisma.personalPlanningDailyReview.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    create: { userId: session.user.id, date, notes: data.notes || null },
    update: { notes: data.notes || null },
  });

  // Le bilan vit sur /planning-personnel (déplacé depuis /ma-journee, voir
  // le commentaire en tête de cette page) — "layout" revalide en plus
  // /planning-personnel/bilans (et le reste du sous-arbre) en un seul appel.
  revalidatePath(PLANNING_PATH, "layout");
  return { id: review.id, notes: review.notes };
}

/** Charge les notes personnelles déjà enregistrées pour une date (ou null si aucune). */
export async function getDailyReviewNotes(dateStr: string): Promise<string | null> {
  const session = await requireSession();
  const date = truncateToDay(dateStr);

  const review = await prisma.personalPlanningDailyReview.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
    select: { notes: true },
  });
  return review?.notes ?? null;
}
