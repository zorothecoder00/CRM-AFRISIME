"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createDelegationSchema,
  deleteDelegationSchema,
  type CreateDelegationInput,
  type DeleteDelegationInput,
} from "@/lib/validations/delegation.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Delegation temporaire d'autorite (cahier des charges §I) — simple registre tracable, pas de reroutage automatique des validations. */
export async function createDelegation(input: CreateDelegationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);
  const data = createDelegationSchema.parse(input);

  const delegation = await prisma.delegation.create({
    data: {
      delegantId: data.delegantId,
      delegataireId: data.delegataireId,
      motif: data.motif,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "delegation.created",
    entityType: "Delegation",
    entityId: delegation.id,
    changes: { delegantId: data.delegantId, delegataireId: data.delegataireId },
  });

  revalidatePath("/administration/delegations");
  return delegation;
}

export async function deleteDelegation(input: DeleteDelegationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);
  const data = deleteDelegationSchema.parse(input);

  const delegation = await prisma.delegation.delete({ where: { id: data.id } });

  await logAudit({
    userId: session.user.id,
    action: "delegation.deleted",
    entityType: "Delegation",
    entityId: delegation.id,
    changes: {},
  });

  revalidatePath("/administration/delegations");
  return delegation;
}
