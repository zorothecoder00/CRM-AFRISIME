"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createProgrammeSchema,
  updateProgrammeSchema,
  linkProjectToProgrammeSchema,
  type CreateProgrammeInput,
  type UpdateProgrammeInput,
  type LinkProjectToProgrammeInput,
} from "@/lib/validations/programme.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createProgramme(input: CreateProgrammeInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = createProgrammeSchema.parse(input);

  const programme = await prisma.programme.create({
    data: {
      nom: data.nom,
      description: data.description || undefined,
      objectif: data.objectif || undefined,
      responsableId: data.responsableId,
      statut: data.statut,
      budget: data.budget ? Number(data.budget) : undefined,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "programme.created",
    entityType: "Programme",
    entityId: programme.id,
    changes: { nom: programme.nom },
  });

  revalidatePath("/programmes");
  return programme;
}

export async function updateProgramme(input: UpdateProgrammeInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = updateProgrammeSchema.parse(input);

  const programme = await prisma.programme.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      description: data.description || undefined,
      objectif: data.objectif || undefined,
      responsableId: data.responsableId,
      statut: data.statut,
      budget: data.budget ? Number(data.budget) : undefined,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "programme.updated",
    entityType: "Programme",
    entityId: programme.id,
    changes: { nom: programme.nom },
  });

  revalidatePath(`/programmes/${data.id}`);
  revalidatePath("/programmes");
  return programme;
}

/** Rattache (ou detache si programmeId absent) un projet existant a un programme. */
export async function linkProjectToProgramme(input: LinkProjectToProgrammeInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = linkProjectToProgrammeSchema.parse(input);

  const project = await prisma.project.update({
    where: { id: data.projectId },
    data: { programmeId: data.programmeId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: data.programmeId ? "programme.project_linked" : "programme.project_unlinked",
    entityType: "Project",
    entityId: project.id,
    changes: { programmeId: data.programmeId ?? null },
  });

  if (data.programmeId) revalidatePath(`/programmes/${data.programmeId}`);
  revalidatePath("/programmes");
  revalidatePath(`/projets/${data.projectId}`);
  return project;
}
