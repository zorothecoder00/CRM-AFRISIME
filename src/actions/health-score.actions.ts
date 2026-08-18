"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { HealthScoreDimension } from "@/generated/prisma/enums";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Organizational Health Score (cahier des charges V3.0 §13) — "le score doit être configurable". */
export async function updateHealthScoreWeight(dimension: HealthScoreDimension, poids: number, isActive: boolean) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_ACCESS);

  await prisma.healthScoreWeight.upsert({
    where: { dimension },
    create: { dimension, poids, isActive },
    update: { poids, isActive },
  });

  await logAudit({
    userId: session.user.id,
    action: "health_score_weight.updated",
    entityType: "HealthScoreWeight",
    entityId: dimension,
    changes: { poids, isActive },
  });

  revalidatePath("/sante-organisationnelle");
}
