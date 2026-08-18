"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { AppCatalogStatut } from "@/generated/prisma/enums";

export async function updateAppCatalogStatut(id: string, statut: AppCatalogStatut) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.MARKETPLACE_MANAGE);

  await prisma.appCatalogEntry.update({ where: { id }, data: { statut } });

  await logAudit({
    userId: session.user.id,
    action: "app_catalog.statut_updated",
    entityType: "AppCatalogEntry",
    entityId: id,
    changes: { statut },
  });

  revalidatePath("/marketplace");
}
