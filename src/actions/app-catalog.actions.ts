"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createAppCatalogEntrySchema,
  updateAppCatalogEntrySchema,
  deleteAppCatalogEntrySchema,
  updateAppCatalogStatutSchema,
  type CreateAppCatalogEntryInput,
  type UpdateAppCatalogEntryInput,
  type DeleteAppCatalogEntryInput,
} from "@/lib/validations/app-catalog.schema";
import type { AppCatalogStatut } from "@/generated/prisma/enums";

export async function updateAppCatalogStatut(id: string, statut: AppCatalogStatut) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.MARKETPLACE_MANAGE);

  const validatedStatut = updateAppCatalogStatutSchema.parse(statut);
  await prisma.appCatalogEntry.update({ where: { id }, data: { statut: validatedStatut } });

  await logAudit({
    userId: session.user.id,
    action: "app_catalog.statut_updated",
    entityType: "AppCatalogEntry",
    entityId: id,
    changes: { statut },
  });

  revalidatePath("/marketplace");
}

export async function createAppCatalogEntry(input: CreateAppCatalogEntryInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.MARKETPLACE_MANAGE);

  const data = createAppCatalogEntrySchema.parse(input);
  const entry = await prisma.appCatalogEntry.create({ data });

  await logAudit({
    userId: session.user.id,
    action: "app_catalog.created",
    entityType: "AppCatalogEntry",
    entityId: entry.id,
    changes: { nom: entry.nom, categorie: entry.categorie },
  });

  revalidatePath("/marketplace");
  return entry;
}

export async function updateAppCatalogEntry(input: UpdateAppCatalogEntryInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.MARKETPLACE_MANAGE);

  const { id, ...data } = updateAppCatalogEntrySchema.parse(input);
  const entry = await prisma.appCatalogEntry.update({ where: { id }, data });

  await logAudit({
    userId: session.user.id,
    action: "app_catalog.updated",
    entityType: "AppCatalogEntry",
    entityId: entry.id,
    changes: { nom: entry.nom, categorie: entry.categorie },
  });

  revalidatePath("/marketplace");
  return entry;
}

export async function deleteAppCatalogEntry(input: DeleteAppCatalogEntryInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.MARKETPLACE_MANAGE);

  const data = deleteAppCatalogEntrySchema.parse(input);
  const entry = await prisma.appCatalogEntry.delete({ where: { id: data.id } });

  await logAudit({
    userId: session.user.id,
    action: "app_catalog.deleted",
    entityType: "AppCatalogEntry",
    entityId: entry.id,
    changes: { nom: entry.nom },
  });

  revalidatePath("/marketplace");
}

/**
 * "Me prévenir quand disponible" — n'importe quel utilisateur connecté peut
 * s'inscrire/se désinscrire (pas besoin de MARKETPLACE_MANAGE, contrairement
 * aux actions ci-dessus qui gèrent le catalogue lui-même). Toggle simple :
 * upsert si absent, delete si déjà inscrit.
 */
export async function toggleAppCatalogInterest(appCatalogEntryId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");

  const existing = await prisma.appCatalogInterest.findUnique({
    where: { appCatalogEntryId_userId: { appCatalogEntryId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.appCatalogInterest.delete({ where: { id: existing.id } });
  } else {
    await prisma.appCatalogInterest.create({
      data: { appCatalogEntryId, userId: session.user.id },
    });
  }

  revalidatePath("/marketplace");
  return { interested: !existing };
}
