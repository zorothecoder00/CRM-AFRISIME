"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  upsertExchangeRateSchema,
  deleteExchangeRateSchema,
  type UpsertExchangeRateInput,
  type DeleteExchangeRateInput,
} from "@/lib/validations/exchange-rate.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function upsertExchangeRate(input: UpsertExchangeRateInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ENTITY_MANAGE);
  const data = upsertExchangeRateSchema.parse(input);

  if (data.fromDevise === data.toDevise) {
    throw new Error("Les deux devises doivent être différentes.");
  }
  const taux = Number(data.taux);
  if (!Number.isFinite(taux) || taux <= 0) {
    throw new Error("Le taux doit être un nombre positif.");
  }

  const rate = await prisma.exchangeRate.upsert({
    where: { fromDevise_toDevise: { fromDevise: data.fromDevise, toDevise: data.toDevise } },
    update: { taux, updatedById: session.user.id },
    create: { fromDevise: data.fromDevise, toDevise: data.toDevise, taux, updatedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "exchange_rate.upserted",
    entityType: "ExchangeRate",
    entityId: rate.id,
    changes: { fromDevise: rate.fromDevise, toDevise: rate.toDevise, taux: Number(rate.taux) },
  });

  revalidatePath("/administration/devises");
  return { ...rate, taux: Number(rate.taux) };
}

export async function deleteExchangeRate(input: DeleteExchangeRateInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ENTITY_MANAGE);
  const data = deleteExchangeRateSchema.parse(input);

  const rate = await prisma.exchangeRate.delete({ where: { id: data.id } });

  await logAudit({
    userId: session.user.id,
    action: "exchange_rate.deleted",
    entityType: "ExchangeRate",
    entityId: rate.id,
    changes: { fromDevise: rate.fromDevise, toDevise: rate.toDevise },
  });

  revalidatePath("/administration/devises");
  return { ...rate, taux: Number(rate.taux) };
}
