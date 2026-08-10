"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  createMeetingSchema,
  updateCompteRenduSchema,
  addDecisionSchema,
  addParticipantSchema,
  type CreateMeetingInput,
  type UpdateCompteRenduInput,
  type AddDecisionInput,
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

  const meeting = await prisma.meeting.create({
    data: {
      projectId: data.projectId,
      titre: data.titre,
      dateHeure: new Date(data.dateHeure),
      lieu: data.lieu,
      ordreDuJour: data.ordreDuJour,
      createdById: session.user.id,
      participants: {
        create: Array.from(new Set([...data.participantIds, session.user.id])).map((userId) => ({
          userId,
        })),
      },
    },
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

  if (data.createTask && !data.responsableId) {
    throw new Error("Un responsable est requis pour créer automatiquement une tâche.");
  }

  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: data.meetingId },
  });

  let taskId: string | undefined;

  if (data.createTask && data.responsableId) {
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
    taskId = task.id;

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "task.created_from_meeting_decision",
        entityType: "Task",
        entityId: task.id,
        changes: { meetingId: data.meetingId },
      },
    });
  }

  const decision = await prisma.meetingDecision.create({
    data: {
      meetingId: data.meetingId,
      description: data.description,
      responsableId: data.responsableId || undefined,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      taskId,
    },
  });

  revalidatePath(`/reunions/${data.meetingId}`);
  revalidatePath("/taches");
  return decision;
}
