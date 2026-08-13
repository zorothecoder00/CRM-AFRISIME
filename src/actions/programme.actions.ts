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
  updateProgrammeCoutReelSchema,
  createProgrammeRiskSchema,
  updateProgrammeRiskStatusSchema,
  deleteProgrammeRiskSchema,
  type CreateProgrammeInput,
  type UpdateProgrammeInput,
  type LinkProjectToProgrammeInput,
  type UpdateProgrammeCoutReelInput,
  type CreateProgrammeRiskInput,
  type UpdateProgrammeRiskStatusInput,
  type DeleteProgrammeRiskInput,
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

export async function updateProgrammeCoutReel(input: UpdateProgrammeCoutReelInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = updateProgrammeCoutReelSchema.parse(input);

  const programme = await prisma.programme.update({
    where: { id: data.programmeId },
    data: { coutReel: Number(data.coutReel) },
  });

  await logAudit({
    userId: session.user.id,
    action: "programme.cout_reel_updated",
    entityType: "Programme",
    entityId: programme.id,
    changes: { coutReel: data.coutReel },
  });

  revalidatePath(`/programmes/${data.programmeId}`);
  return programme;
}

// ---- Risques (cahier des charges §V) ----

export async function createProgrammeRisk(input: CreateProgrammeRiskInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = createProgrammeRiskSchema.parse(input);

  const risk = await prisma.programmeRisk.create({
    data: {
      programmeId: data.programmeId,
      titre: data.titre,
      description: data.description,
      probabilite: data.probabilite,
      impact: data.impact,
      planMitigation: data.planMitigation,
      responsableId: data.responsableId || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "programme.risk_created",
    entityType: "ProgrammeRisk",
    entityId: risk.id,
    changes: { titre: risk.titre, programmeId: data.programmeId },
  });

  revalidatePath(`/programmes/${data.programmeId}`);
  return risk;
}

export async function updateProgrammeRiskStatus(input: UpdateProgrammeRiskStatusInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = updateProgrammeRiskStatusSchema.parse(input);

  const risk = await prisma.programmeRisk.update({
    where: { id: data.riskId },
    data: { statut: data.statut },
  });

  await logAudit({
    userId: session.user.id,
    action: "programme.risk_status_updated",
    entityType: "ProgrammeRisk",
    entityId: risk.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/programmes/${risk.programmeId}`);
  return risk;
}

export async function deleteProgrammeRisk(input: DeleteProgrammeRiskInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = deleteProgrammeRiskSchema.parse(input);

  const risk = await prisma.programmeRisk.delete({ where: { id: data.riskId } });

  await logAudit({
    userId: session.user.id,
    action: "programme.risk_deleted",
    entityType: "ProgrammeRisk",
    entityId: risk.id,
    changes: { titre: risk.titre },
  });

  revalidatePath(`/programmes/${risk.programmeId}`);
  return risk;
}
