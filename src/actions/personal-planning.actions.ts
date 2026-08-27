"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import {
  createPersonalPlanningEntrySchema,
  updatePersonalPlanningEntrySchema,
  deletePersonalPlanningEntrySchema,
  getAvailabilitySchema,
  createAvailabilityRequestSchema,
  decideAvailabilityRequestSchema,
  cancelAvailabilityRequestSchema,
  type CreatePersonalPlanningEntryInput,
  type UpdatePersonalPlanningEntryInput,
  type DeletePersonalPlanningEntryInput,
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

export async function createPersonalPlanningEntry(input: CreatePersonalPlanningEntryInput) {
  const session = await requireSession();
  const data = createPersonalPlanningEntrySchema.parse(input);

  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const entry = await prisma.personalPlanningEntry.create({
    data: {
      userId: session.user.id,
      titre: data.titre,
      notes: data.notes,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      type: data.type,
    },
  });

  revalidatePath(PLANNING_PATH);
  return { ...entry, dateDebut: entry.dateDebut.toISOString(), dateFin: entry.dateFin.toISOString() };
}

export async function updatePersonalPlanningEntry(input: UpdatePersonalPlanningEntryInput) {
  const session = await requireSession();
  const data = updatePersonalPlanningEntrySchema.parse(input);

  const existing = await prisma.personalPlanningEntry.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.userId !== session.user.id) {
    throw new Error("Vous ne pouvez modifier que vos propres entrées de planning.");
  }
  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const entry = await prisma.personalPlanningEntry.update({
    where: { id: data.id },
    data: {
      titre: data.titre,
      notes: data.notes,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      type: data.type,
    },
  });

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
