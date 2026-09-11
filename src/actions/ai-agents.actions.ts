"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { AiInsightStatut } from "@/generated/prisma/enums";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

// Revue de robustesse (2026-09-11) — `statut` n'était typé qu'en TypeScript,
// aucune protection runtime pour une Server Action (le typage disparaît à la
// frontière client/serveur).
const updateInsightStatusSchema = z.enum([
  AiInsightStatut.NOUVEAU,
  AiInsightStatut.VU,
  AiInsightStatut.TRAITE,
  AiInsightStatut.IGNORE,
]);

export async function updateInsightStatus(insightId: string, statut: AiInsightStatut) {
  const session = await requireSession();
  // Pas de permission dédiée aux insights IA — réutilise AI_GOVERNANCE_APPROVE
  // (même périmètre fonctionnel que ai-governance.actions.ts) plutôt que
  // laisser n'importe quel utilisateur authentifié modifier le statut de
  // n'importe quel insight.
  requirePermission(session.user.permissions, PERMISSIONS.AI_GOVERNANCE_APPROVE);
  const validatedStatut = updateInsightStatusSchema.parse(statut);

  const insight = await prisma.aiAgentInsight.update({ where: { id: insightId }, data: { statut: validatedStatut } });
  revalidatePath("/agents-ia");
  return insight;
}
