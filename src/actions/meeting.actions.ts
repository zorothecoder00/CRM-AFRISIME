"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { buildRecurrenceDates } from "@/lib/meeting-recurrence";
import { runMeetingCreatedRules, runMeetingDecisionCreatedRules } from "@/lib/automation";
import {
  createMeetingSchema,
  updateCompteRenduSchema,
  addDecisionSchema,
  updateDecisionStatusSchema,
  addParticipantSchema,
  type CreateMeetingInput,
  type UpdateCompteRenduInput,
  type AddDecisionInput,
  type UpdateDecisionStatusInput,
} from "@/lib/validations/meeting.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createMeeting(input: CreateMeetingInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEETING_CREATE);

  const data = createMeetingSchema.parse(input);
  const participantIds = Array.from(new Set([...data.participantIds, session.user.id]));

  const meeting = await prisma.meeting.create({
    data: {
      projectId: data.projectId,
      titre: data.titre,
      dateHeure: new Date(data.dateHeure),
      lieu: data.lieu,
      ordreDuJour: data.ordreDuJour,
      recurrence: data.recurrence,
      createdById: session.user.id,
      participants: {
        create: participantIds.map((userId) => ({ userId })),
      },
    },
  });

  // Reunions recurrentes (cahier des charges §XI) : genere les occurrences
  // suivantes d'un coup, toutes rattachees a celle-ci via recurrenceParentId.
  if (data.recurrence !== "AUCUNE") {
    const occurrenceDates = buildRecurrenceDates(
      new Date(data.dateHeure),
      data.recurrence,
      data.recurrenceFin ? new Date(data.recurrenceFin) : undefined
    );
    for (const dateHeure of occurrenceDates) {
      await prisma.meeting.create({
        data: {
          projectId: data.projectId,
          titre: data.titre,
          dateHeure,
          lieu: data.lieu,
          ordreDuJour: data.ordreDuJour,
          recurrence: data.recurrence,
          recurrenceParentId: meeting.id,
          createdById: session.user.id,
          participants: { create: participantIds.map((userId) => ({ userId })) },
        },
      });
    }
  }

  await runMeetingCreatedRules({
    id: meeting.id,
    titre: meeting.titre,
    projectId: meeting.projectId,
    createdById: meeting.createdById,
  });

  revalidatePath("/reunions");
  return meeting;
}

export async function addParticipant(meetingId: string, userId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEETING_MANAGE_PARTICIPANTS);

  const data = addParticipantSchema.parse({ meetingId, userId });

  const participant = await prisma.meetingParticipant.create({
    data: { meetingId: data.meetingId, userId: data.userId },
  });

  revalidatePath(`/reunions/${meetingId}`);
  return participant;
}

export async function updateCompteRendu(input: UpdateCompteRenduInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEETING_UPDATE);

  const data = updateCompteRenduSchema.parse(input);

  const meeting = await prisma.meeting.update({
    where: { id: data.meetingId },
    data: { compteRendu: data.compteRendu, statut: data.statut },
  });

  revalidatePath(`/reunions/${data.meetingId}`);
  return meeting;
}

export async function addDecision(input: AddDecisionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEETING_UPDATE);

  const data = addDecisionSchema.parse(input);

  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: data.meetingId },
  });

  // Cahier des charges §8 : « les actions décidées deviennent automatiquement
  // des tâches » — sans condition, pas une option togglable côté client.
  const task = await prisma.task.create({
    data: {
      projectId: meeting.projectId,
      titre: data.description,
      statut: "A_FAIRE",
      priorite: "MOYENNE",
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      responsablePrincipalId: data.responsableId,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "task.created_from_meeting_decision",
    entityType: "Task",
    entityId: task.id,
    changes: { meetingId: data.meetingId },
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

  const decision = await prisma.meetingDecision.create({
    data: {
      meetingId: data.meetingId,
      description: data.description,
      motif: data.motif || undefined,
      responsableId: data.responsableId,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      taskId: task.id,
    },
  });

  await runMeetingDecisionCreatedRules({
    id: decision.id,
    description: decision.description,
    projectId: meeting.projectId,
    responsableId: decision.responsableId,
  });

  revalidatePath(`/reunions/${data.meetingId}`);
  revalidatePath("/taches");
  return decision;
}

export async function updateDecisionStatus(input: UpdateDecisionStatusInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEETING_UPDATE);

  const data = updateDecisionStatusSchema.parse(input);

  const decision = await prisma.meetingDecision.update({
    where: { id: data.decisionId },
    data: { statut: data.statut },
  });

  await logAudit({
    userId: session.user.id,
    action: "decision.status_updated",
    entityType: "MeetingDecision",
    entityId: decision.id,
    changes: { statut: data.statut },
  });

  if (decision.meetingId) revalidatePath(`/reunions/${decision.meetingId}`);
  if (decision.projectId) revalidatePath(`/projets/${decision.projectId}`);
  return decision;
}
