"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createSwotItemSchema, type CreateSwotItemInput } from "@/lib/validations/swot.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Analyse SWOT (cahier des charges V3.0 §10) — meme permission que les axes strategiques, dont elle est le pendant. */
export async function createSwotItem(input: CreateSwotItemInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = createSwotItemSchema.parse(input);

  const item = await prisma.swotItem.create({
    data: { categorie: data.categorie, contenu: data.contenu, createdById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "swot_item.created",
    entityType: "SwotItem",
    entityId: item.id,
    changes: { categorie: item.categorie },
  });

  revalidatePath("/copilot-strategique");
  return item;
}

export async function deleteSwotItem(id: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);

  const item = await prisma.swotItem.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "swot_item.deleted",
    entityType: "SwotItem",
    entityId: item.id,
  });

  revalidatePath("/copilot-strategique");
}
