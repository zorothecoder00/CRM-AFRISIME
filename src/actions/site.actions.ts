"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createSiteSchema,
  updateSiteSchema,
  deleteSiteSchema,
  type CreateSiteInput,
  type UpdateSiteInput,
  type DeleteSiteInput,
} from "@/lib/validations/site.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createSite(input: CreateSiteInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = createSiteSchema.parse(input);

  const site = await prisma.site.create({
    data: {
      nom: data.nom,
      ville: data.ville,
      pays: data.pays,
      adresse: data.adresse,
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
      departmentId: data.departmentId || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "site.created",
    entityType: "Site",
    entityId: site.id,
    changes: { nom: site.nom },
  });

  revalidatePath("/administration/sites");
  return site;
}

export async function updateSite(input: UpdateSiteInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = updateSiteSchema.parse(input);

  const site = await prisma.site.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      ville: data.ville,
      pays: data.pays,
      adresse: data.adresse,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      departmentId: data.departmentId || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "site.updated",
    entityType: "Site",
    entityId: site.id,
    changes: { nom: site.nom },
  });

  revalidatePath("/administration/sites");
  return site;
}

export async function deleteSite(input: DeleteSiteInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = deleteSiteSchema.parse(input);

  const site = await prisma.site.delete({ where: { id: data.id } });

  await logAudit({
    userId: session.user.id,
    action: "site.deleted",
    entityType: "Site",
    entityId: site.id,
    changes: { nom: site.nom },
  });

  revalidatePath("/administration/sites");
  return site;
}
