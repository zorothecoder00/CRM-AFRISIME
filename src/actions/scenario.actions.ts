"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createScenarioSchema, type CreateScenarioInput } from "@/lib/validations/scenario.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createScenario(input: CreateScenarioInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.REPORT_EXPORT);

  const data = createScenarioSchema.parse(input);

  const scenario = await prisma.scenario.create({
    data: {
      nom: data.nom,
      description: data.description || undefined,
      type: data.type,
      deltaEffectifPercent: data.deltaEffectifPercent ? Number(data.deltaEffectifPercent) : undefined,
      deltaRessourcesPercent: data.deltaRessourcesPercent ? Number(data.deltaRessourcesPercent) : undefined,
      deltaProjetsPercent: data.deltaProjetsPercent ? Number(data.deltaProjetsPercent) : undefined,
      nouvelleFilialeEffectif: data.nouvelleFilialeEffectif ? Number(data.nouvelleFilialeEffectif) : undefined,
      nouvelleFilialeProjets: data.nouvelleFilialeProjets ? Number(data.nouvelleFilialeProjets) : undefined,
      departmentId: data.departmentId || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "scenario.created",
    entityType: "Scenario",
    entityId: scenario.id,
    changes: { nom: scenario.nom, type: scenario.type },
  });

  revalidatePath("/scenarios");
  // Les champs Decimal ne sont pas serialisables au client (composant
  // "use client" appelant cette action via useAction) — on ne renvoie que
  // l'id, seul champ reellement utilise par les appelants.
  return { id: scenario.id };
}

export async function deleteScenario(scenarioId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.REPORT_EXPORT);

  const scenario = await prisma.scenario.delete({ where: { id: scenarioId } });

  await logAudit({
    userId: session.user.id,
    action: "scenario.deleted",
    entityType: "Scenario",
    entityId: scenario.id,
  });

  revalidatePath("/scenarios");
  return { id: scenario.id };
}
