import { z } from "zod";

export const updateOrganizationProfileSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
  vision: z.string().optional(),
  mission: z.string().optional(),
  valeurs: z.string().optional(),
  siteWeb: z.string().optional(),
});

export type UpdateOrganizationProfileInput = z.infer<typeof updateOrganizationProfileSchema>;
