"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { analyzeTeamDeletionImpact } from "@/lib/impact-analysis";
import {
  createTeamSchema,
  updateTeamSchema,
  teamMemberSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
  type TeamMemberInput,
} from "@/lib/validations/team.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createTeam(input: CreateTeamInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = createTeamSchema.parse(input);

  const team = await prisma.team.create({
    data: {
      nom: data.nom,
      departmentId: data.departmentId,
      leaderId: data.leaderId || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "team.created",
    entityType: "Team",
    entityId: team.id,
    changes: { nom: team.nom, departmentId: team.departmentId },
  });

  revalidatePath("/administration/equipes");
  return team;
}

export async function updateTeam(input: UpdateTeamInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = updateTeamSchema.parse(input);

  const team = await prisma.team.update({
    where: { id: data.id },
    data: { nom: data.nom, departmentId: data.departmentId, leaderId: data.leaderId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: "team.updated",
    entityType: "Team",
    entityId: team.id,
    changes: { nom: team.nom },
  });

  revalidatePath("/administration/equipes");
  return team;
}

// V3.0 §6 — Analyse d'impact avant suppression d'une equipe (l'exemple
// detaille par le cahier des charges).
export async function getTeamImpactAnalysis(id: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  return analyzeTeamDeletionImpact(id);
}

export async function deleteTeam(id: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);

  const team = await prisma.team.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "team.deleted",
    entityType: "Team",
    entityId: team.id,
    changes: { nom: team.nom },
  });

  revalidatePath("/administration/equipes");
}

export async function addTeamMember(input: TeamMemberInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = teamMemberSchema.parse(input);

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: data.teamId, userId: data.userId } },
    update: {},
    create: { teamId: data.teamId, userId: data.userId },
  });

  await logAudit({
    userId: session.user.id,
    action: "team.member_added",
    entityType: "Team",
    entityId: data.teamId,
    changes: { userId: data.userId },
  });

  revalidatePath("/administration/equipes");
}

export async function removeTeamMember(input: TeamMemberInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = teamMemberSchema.parse(input);

  await prisma.teamMember.deleteMany({ where: { teamId: data.teamId, userId: data.userId } });

  await logAudit({
    userId: session.user.id,
    action: "team.member_removed",
    entityType: "Team",
    entityId: data.teamId,
    changes: { userId: data.userId },
  });

  revalidatePath("/administration/equipes");
}
