"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { runEventCreatedRules } from "@/lib/automation";
import { reorganizeEntriesForApprovedLeave } from "@/lib/personal-planning-leave-reorg";
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

  await logAudit({
    userId: session.user.id,
    action: "leave.created",
    entityType: "Leave",
    entityId: leave.id,
    changes: { type: leave.type, dateDebut: data.dateDebut, dateFin: data.dateFin },
  });

  revalidatePath("/calendrier");
  return leave;
}

export async function decideLeave(input: DecideLeaveInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.LEAVE_MANAGE);

  const data = decideLeaveSchema.parse(input);

  // Revue de robustesse (2026-09-11) — contrairement à decideAdminRequest
  // (admin-request.actions.ts), rien ne vérifiait que le congé était encore
  // EN_ATTENTE : un congé déjà décidé pouvait être re-décidé, et ré-approuver
  // un congé déjà approuvé relançait reorganizeEntriesForApprovedLeave et la
  // notification une seconde fois. Garde de statut dans le WHERE (updateMany
  // + count) pour un verrou effectif même sous forte concurrence.
  const { count } = await prisma.leave.updateMany({
    where: { id: data.leaveId, statut: "EN_ATTENTE" },
    data: { statut: data.statut, decidedById: session.user.id },
  });
  if (count === 0) {
    throw new Error("Ce congé a déjà été traité.");
  }
  const leave = await prisma.leave.findUniqueOrThrow({ where: { id: data.leaveId } });

  await logAudit({
    userId: session.user.id,
    action: "leave.decided",
    entityType: "Leave",
    entityId: leave.id,
    changes: { statut: data.statut },
  });

  await createNotification({
    userId: leave.userId,
    type: "VALIDATION",
    titre:
      data.statut === "APPROUVE"
        ? "Votre demande de congé a été approuvée."
        : "Votre demande de congé a été refusée.",
    lien: "/calendrier",
    entityType: "Leave",
    entityId: leave.id,
  });

  if (data.statut === "APPROUVE") {
    // §41 — un congé approuvé réorganise le planning personnel déjà programmé
    // pendant la période (jamais bloquant, alerte le manager si nécessaire).
    await reorganizeEntriesForApprovedLeave(leave.id, leave.userId, leave.dateDebut, leave.dateFin, session.user.id);
  }

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

  await logAudit({
    userId: session.user.id,
    action: "event.created",
    entityType: "Event",
    entityId: event.id,
    changes: { titre: event.titre },
  });

  await runEventCreatedRules({
    id: event.id,
    titre: event.titre,
    projectId: event.projectId,
    createdById: event.createdById,
  });

  revalidatePath("/calendrier");
  return event;
}
