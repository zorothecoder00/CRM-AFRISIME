import { z } from "zod";

export const updateOrganizationProfileSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
  vision: z.string().optional(),
  mission: z.string().optional(),
  valeurs: z.string().optional(),
  siteWeb: z.string().optional(),
  devise: z.string().min(1, "La devise est requise.").max(10),
});

export type UpdateOrganizationProfileInput = z.infer<typeof updateOrganizationProfileSchema>;
