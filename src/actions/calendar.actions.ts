"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  createLeaveSchema,
  decideLeaveSchema,
  createEventSchema,
  type CreateLeaveInput,
  type DecideLeaveInput,
  type CreateEventInput,
} from "@/lib/validations/calendar.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createLeave(input: CreateLeaveInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.LEAVE_CREATE);

  const data = createLeaveSchema.parse(input);

  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const leave = await prisma.leave.create({
    data: {
      userId: session.user.id,
      type: data.type,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      motif: data.motif,
    },
  });

  revalidatePath("/calendrier");
  return leave;
}

export async function decideLeave(input: DecideLeaveInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.LEAVE_MANAGE);

  const data = decideLeaveSchema.parse(input);

  const leave = await prisma.leave.update({
    where: { id: data.leaveId },
    data: { statut: data.statut, decidedById: session.user.id },
  });

  revalidatePath("/calendrier");
  return leave;
}

export async function createEvent(input: CreateEventInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.EVENT_CREATE);

  const data = createEventSchema.parse(input);

  const event = await prisma.event.create({
    data: {
      titre: data.titre,
      description: data.description,
      dateDebut: new Date(data.dateDebut),
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
      projectId: data.projectId || undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/calendrier");
  return event;
}
