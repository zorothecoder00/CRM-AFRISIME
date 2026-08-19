"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createPlatformOrganizationSchema,
  updatePlatformOrganizationSchema,
  type CreatePlatformOrganizationInput,
  type UpdatePlatformOrganizationInput,
} from "@/lib/validations/platform-organization.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Registre des organisations de la plateforme (cahier des charges V3.0 §27). */
export async function createPlatformOrganization(input: CreatePlatformOrganizationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLATFORM_MANAGE);
  const data = createPlatformOrganizationSchema.parse(input);

  const org = await prisma.platformOrganization.create({
    data: {
      nom: data.nom,
      slug: data.slug,
      plan: data.plan,
      logoUrl: data.logoUrl || undefined,
      couleurPrimaire: data.couleurPrimaire || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "platform_organization.created",
    entityType: "PlatformOrganization",
    entityId: org.id,
    changes: { nom: org.nom, slug: org.slug },
  });

  revalidatePath("/administration/plateforme");
  return { id: org.id };
}

export async function updatePlatformOrganization(input: UpdatePlatformOrganizationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLATFORM_MANAGE);
  const data = updatePlatformOrganizationSchema.parse(input);

  const org = await prisma.platformOrganization.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      statut: data.statut,
      plan: data.plan,
      logoUrl: data.logoUrl || undefined,
      couleurPrimaire: data.couleurPrimaire || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "platform_organization.updated",
    entityType: "PlatformOrganization",
    entityId: org.id,
    changes: { statut: org.statut, plan: org.plan },
  });

  revalidatePath("/administration/plateforme");
  return { id: org.id };
}
