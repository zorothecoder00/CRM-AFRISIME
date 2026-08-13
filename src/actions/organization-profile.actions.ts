"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  updateOrganizationProfileSchema,
  type UpdateOrganizationProfileInput,
} from "@/lib/validations/organization-profile.schema";

const SINGLETON_ID = "org-profile";

/** Profil de l'organisation (cahier des charges §I / §III) — ligne unique, upsert sur un id fixe. */
export async function updateOrganizationProfile(input: UpdateOrganizationProfileInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_ACCESS);

  const data = updateOrganizationProfileSchema.parse(input);

  const profile = await prisma.organizationProfile.upsert({
    where: { id: SINGLETON_ID },
    update: {
      nom: data.nom,
      logoUrl: data.logoUrl || null,
      description: data.description || null,
      vision: data.vision || null,
      mission: data.mission || null,
      valeurs: data.valeurs || null,
      siteWeb: data.siteWeb || null,
      updatedById: session.user.id,
    },
    create: {
      id: SINGLETON_ID,
      nom: data.nom,
      logoUrl: data.logoUrl || null,
      description: data.description || null,
      vision: data.vision || null,
      mission: data.mission || null,
      valeurs: data.valeurs || null,
      siteWeb: data.siteWeb || null,
      updatedById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "organization_profile.updated",
    entityType: "OrganizationProfile",
    entityId: profile.id,
    changes: { nom: profile.nom },
  });

  revalidatePath("/administration/profil");
  return profile;
}
