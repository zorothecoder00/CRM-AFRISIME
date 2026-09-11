"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { analyzeTeamDeletionImpact } from "@/lib/impact-analysis";
import { isRoleSeniorTo } from "@/lib/role-hierarchy";
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

function isTeamAdmin(permissions: string[]): boolean {
  return hasPermission(permissions, PERMISSIONS.DEPARTMENT_MANAGE) || hasPermission(permissions, PERMISSIONS.TEAM_CREATE);
}

/**
 * Revue fonctionnelle (2026-09-11) — un responsable d'équipe gère
 * désormais SA PROPRE équipe (renommer, changer département/responsable,
 * supprimer, membres) sans avoir besoin d'un droit admin, en plus du
 * panneau d'administration existant (/administration/equipes, toujours
 * accessible à qui a DEPARTMENT_MANAGE/TEAM_CREATE, sur N'IMPORTE QUELLE
 * équipe). Lève une erreur si ni l'un ni l'autre.
 */
async function assertCanManageTeam(session: { user: { id: string; permissions: string[] } }, teamId: string) {
  if (isTeamAdmin(session.user.permissions)) return;
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { leaderId: true } });
  if (team.leaderId !== session.user.id) {
    throw new Error("Seul le responsable de cette équipe (ou un administrateur) peut la gérer.");
  }
}

/**
 * Demande utilisateur — n'importe qui peut créer une équipe et en devient
 * automatiquement responsable (leaderId forcé, ignore toute valeur reçue du
 * client) ; seul un titulaire de DEPARTMENT_MANAGE/TEAM_CREATE (panneau
 * d'administration) garde la main pour désigner un tiers comme responsable.
 */
export async function createTeam(input: CreateTeamInput) {
  const session = await requireSession();
  const data = createTeamSchema.parse(input);
  const isAdmin = isTeamAdmin(session.user.permissions);

  const team = await prisma.team.create({
    data: {
      nom: data.nom,
      departmentId: data.departmentId,
      leaderId: isAdmin ? data.leaderId || undefined : session.user.id,
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
  revalidatePath("/planning-personnel/equipe");
  return team;
}

export async function updateTeam(input: UpdateTeamInput) {
  const session = await requireSession();
  const data = updateTeamSchema.parse(input);
  await assertCanManageTeam(session, data.id);

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
  revalidatePath("/planning-personnel/equipe");
  return team;
}

// V3.0 §6 — Analyse d'impact avant suppression d'une equipe (l'exemple
// detaille par le cahier des charges).
export async function getTeamImpactAnalysis(id: string) {
  const session = await requireSession();
  await assertCanManageTeam(session, id);
  return analyzeTeamDeletionImpact(id);
}

export async function deleteTeam(id: string) {
  const session = await requireSession();
  await assertCanManageTeam(session, id);

  // Revue de robustesse (2026-09-11) — une équipe encore référencée ailleurs
  // (FK) plantait avec l'erreur Prisma brute au lieu d'un message clair.
  let team;
  try {
    team = await prisma.team.delete({ where: { id } });
  } catch {
    throw new Error("Impossible de supprimer : cette équipe a encore des membres ou des rattachements.");
  }

  await logAudit({
    userId: session.user.id,
    action: "team.deleted",
    entityType: "Team",
    entityId: team.id,
    changes: { nom: team.nom },
  });

  revalidatePath("/administration/equipes");
  revalidatePath("/planning-personnel/equipe");
}

export async function addTeamMember(input: TeamMemberInput) {
  const session = await requireSession();
  const data = teamMemberSchema.parse(input);
  await assertCanManageTeam(session, data.teamId);

  // Demande utilisateur — aucun utilisateur (admin compris) ne peut ajouter
  // à une équipe un membre hiérarchiquement plus élevé que lui-même (voir
  // role-hierarchy.ts, ordre de séniorité des rôles).
  const targetUser = await prisma.user.findUniqueOrThrow({ where: { id: data.userId }, select: { role: { select: { key: true } } } });
  if (isRoleSeniorTo(targetUser.role.key, session.user.roleKey)) {
    throw new Error("Vous ne pouvez pas ajouter un membre dont le rôle est hiérarchiquement supérieur au vôtre.");
  }

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
  revalidatePath("/planning-personnel/equipe");
}

export async function removeTeamMember(input: TeamMemberInput) {
  const session = await requireSession();
  const data = teamMemberSchema.parse(input);
  await assertCanManageTeam(session, data.teamId);

  await prisma.teamMember.deleteMany({ where: { teamId: data.teamId, userId: data.userId } });

  await logAudit({
    userId: session.user.id,
    action: "team.member_removed",
    entityType: "Team",
    entityId: data.teamId,
    changes: { userId: data.userId },
  });

  revalidatePath("/administration/equipes");
  revalidatePath("/planning-personnel/equipe");
}
