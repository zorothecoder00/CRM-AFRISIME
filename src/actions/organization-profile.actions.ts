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

/**
 * Profil de l'organisation (cahier des charges §I / §III) — un profil par
 * organisation, upsert sur `organizationId` (revue de robustesse 2026-09-11 :
 * l'ancien upsert sur un id fixe "org-profile" faisait partager la même
 * ligne par toutes les organisations, chaque modification écrasant celle
 * des autres). `organizationId` peut être `null` pour un utilisateur pas
 * encore rattaché (backfill en cours, voir tenant-scoped-prisma.ts) — dans
 * ce cas la ligne historique (avant le retrofit multi-tenant) sert de repli.
 */
export async function updateOrganizationProfile(input: UpdateOrganizationProfileInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_ACCESS);

  const data = updateOrganizationProfileSchema.parse(input);
  const organizationId = session.user.organizationId;

  const fields = {
    nom: data.nom,
    logoUrl: data.logoUrl || null,
    description: data.description || null,
    vision: data.vision || null,
    mission: data.mission || null,
    valeurs: data.valeurs || null,
    siteWeb: data.siteWeb || null,
    devise: data.devise,
    updatedById: session.user.id,
  };

  // Repli sur l'ancien id fixe uniquement pour une session pas encore
  // rattachée à une organisation — évite de reposer sur un `where` unique
  // sur `organizationId: null` (plusieurs lignes peuvent légitimement avoir
  // organizationId = null en base, la contrainte unique Postgres l'autorise).
  const profile = organizationId
    ? await prisma.organizationProfile.upsert({
        where: { organizationId },
        update: fields,
        create: { ...fields, organizationId },
      })
    : await prisma.organizationProfile.upsert({
        where: { id: "org-profile" },
        update: fields,
        create: { ...fields, id: "org-profile" },
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
