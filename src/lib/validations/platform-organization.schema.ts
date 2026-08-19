import { z } from "zod";

export const PLATFORM_ORGANIZATION_STATUTS = ["ACTIVE", "SUSPENDUE", "ARCHIVEE"] as const;
export const PLATFORM_ORGANIZATION_PLANS = ["GRATUIT", "STANDARD", "PREMIUM"] as const;

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const createPlatformOrganizationSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  slug: z.string().min(2, "L'identifiant est requis.").regex(slugRegex, "Minuscules, chiffres et tirets uniquement."),
  plan: z.enum(PLATFORM_ORGANIZATION_PLANS),
  logoUrl: z.string().optional(),
  couleurPrimaire: z.string().optional(),
});

export type CreatePlatformOrganizationInput = z.infer<typeof createPlatformOrganizationSchema>;

export const updatePlatformOrganizationSchema = z.object({
  id: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  statut: z.enum(PLATFORM_ORGANIZATION_STATUTS),
  plan: z.enum(PLATFORM_ORGANIZATION_PLANS),
  logoUrl: z.string().optional(),
  couleurPrimaire: z.string().optional(),
});

export type UpdatePlatformOrganizationInput = z.infer<typeof updatePlatformOrganizationSchema>;
