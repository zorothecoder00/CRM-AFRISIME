"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  updateCapacitySchema,
  type UpdateCapacityInput,
} from "@/lib/validations/workload.schema";

export async function updateCapacity(input: UpdateCapacityInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.WORKLOAD_MANAGE);

  const data = updateCapacitySchema.parse(input);

  let user;
  try {
    user = await prisma.user.update({
      where: { id: data.userId },
      data: { capaciteHebdomadaireHeures: Number(data.capaciteHebdomadaireHeures) },
    });
  } catch (err) {
    // Defense en profondeur — le schema Zod borne deja 0-168h, mais un
    // depassement de la colonne Decimal(5,2) reste un message clair plutot
    // que l'erreur Prisma brute (voir memoire du bug de production).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2020") {
      throw new Error("Valeur hors limites pour la capacité hebdomadaire.");
    }
    throw err;
  }

  await logAudit({
    userId: session.user.id,
    action: "workload.capacity_updated",
    entityType: "User",
    entityId: data.userId,
    changes: { capaciteHebdomadaireHeures: data.capaciteHebdomadaireHeures },
  });

  revalidatePath("/charge-de-travail");
  return { ...user, capaciteHebdomadaireHeures: Number(user.capaciteHebdomadaireHeures) };
}
