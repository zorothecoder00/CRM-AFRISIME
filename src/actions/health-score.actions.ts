"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { HEALTH_SCORE_CACHE_TAG } from "@/lib/health-score";
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

  // updateTag (pas revalidateTag) : Server Action + lecture-de-sa-propre-
  // ecriture — l'admin qui vient de changer un poids doit voir le score
  // recalcule immediatement, pas un stale-while-revalidate en arriere-plan.
  updateTag(HEALTH_SCORE_CACHE_TAG);
  revalidatePath("/sante-organisationnelle");
}
