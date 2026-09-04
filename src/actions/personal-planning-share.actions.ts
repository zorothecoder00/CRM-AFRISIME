"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Partage du planning personnel (demande utilisateur — "partager son agenda
 * avec une secrétaire par exemple") : octroi en lecture seule (LECTEUR,
 * défaut) ou en édition (EDITEUR — peut ajouter/modifier des activités sur
 * l'agenda du propriétaire, voir hasAgendaEditPermission), sans lien
 * hiérarchique requis (voir personal-planning-access.ts). Le bénéficiaire
 * consulte ensuite via /planning-personnel/equipe/[userId], comme un manager.
 */
export async function shareAgenda(granteeId: string, role: "LECTEUR" | "EDITEUR" = "LECTEUR") {
  const session = await requireSession();
  if (granteeId === session.user.id) {
    throw new Error("Vous ne pouvez pas vous partager votre propre agenda.");
  }

  const share = await prisma.personalPlanningShare.upsert({
    where: { ownerId_granteeId: { ownerId: session.user.id, granteeId } },
    update: { role },
    create: { ownerId: session.user.id, granteeId, role },
  });

  await logAudit({
    userId: session.user.id,
    action: "personal_planning_share.created",
    entityType: "PersonalPlanningShare",
    entityId: share.id,
    changes: { granteeId, role },
  });

  revalidatePath("/planning-personnel/agenda");
  return { id: share.id };
}

export async function updateAgendaShareRole(shareId: string, role: "LECTEUR" | "EDITEUR") {
  const session = await requireSession();

  const existing = await prisma.personalPlanningShare.findUniqueOrThrow({ where: { id: shareId } });
  if (existing.ownerId !== session.user.id) {
    throw new Error("Vous ne pouvez modifier que vos propres partages.");
  }

  await prisma.personalPlanningShare.update({ where: { id: shareId }, data: { role } });

  await logAudit({
    userId: session.user.id,
    action: "personal_planning_share.role_updated",
    entityType: "PersonalPlanningShare",
    entityId: shareId,
    changes: { role },
  });

  revalidatePath("/planning-personnel/agenda");
}

export async function revokeAgendaShare(shareId: string) {
  const session = await requireSession();

  const existing = await prisma.personalPlanningShare.findUniqueOrThrow({ where: { id: shareId } });
  if (existing.ownerId !== session.user.id) {
    throw new Error("Vous ne pouvez révoquer que vos propres partages.");
  }

  await prisma.personalPlanningShare.delete({ where: { id: shareId } });

  await logAudit({
    userId: session.user.id,
    action: "personal_planning_share.revoked",
    entityType: "PersonalPlanningShare",
    entityId: shareId,
  });

  revalidatePath("/planning-personnel/agenda");
}
