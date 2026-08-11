"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const user = await prisma.user.update({
    where: { id: data.userId },
    data: { capaciteHebdomadaireHeures: Number(data.capaciteHebdomadaireHeures) },
  });

  await logAudit({
    userId: session.user.id,
    action: "workload.capacity_updated",
    entityType: "User",
    entityId: data.userId,
    changes: { capaciteHebdomadaireHeures: data.capaciteHebdomadaireHeures },
  });

  revalidatePath("/charge-de-travail");
  return user;
}
