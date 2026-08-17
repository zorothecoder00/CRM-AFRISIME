"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AiInsightStatut } from "@/generated/prisma/enums";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function updateInsightStatus(insightId: string, statut: AiInsightStatut) {
  await requireSession();
  const insight = await prisma.aiAgentInsight.update({ where: { id: insightId }, data: { statut } });
  revalidatePath("/agents-ia");
  return insight;
}
