import { z } from "zod";

export const createSiteSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  ville: z.string().optional(),
  pays: z.string().optional(),
  adresse: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  departmentId: z.string().optional(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const updateSiteSchema = createSiteSchema.extend({
  id: z.string().min(1),
});

export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;

export const deleteSiteSchema = z.object({ id: z.string().min(1) });

export type DeleteSiteInput = z.infer<typeof deleteSiteSchema>;
