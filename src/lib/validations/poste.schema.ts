import { z } from "zod";

export const createPosteSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  responsabilites: z.string().optional(),
  departmentId: z.string().optional(),
});

export type CreatePosteInput = z.infer<typeof createPosteSchema>;

export const updatePosteSchema = createPosteSchema.extend({
  id: z.string().min(1),
});

export type UpdatePosteInput = z.infer<typeof updatePosteSchema>;

export const deletePosteSchema = z.object({ id: z.string().min(1) });

export type DeletePosteInput = z.infer<typeof deletePosteSchema>;

export const addPosteResponsabiliteSchema = z.object({
  posteId: z.string().min(1),
  libelle: z.string().min(2, "Le libellé est requis."),
});

export type AddPosteResponsabiliteInput = z.infer<typeof addPosteResponsabiliteSchema>;

// Poste critique (cahier des charges V3.0 §24) — flag alimentant le Talent &
// Succession Planning et le Workforce Planning (§22).
export const setPosteCritiqueSchema = z.object({
  id: z.string().min(1),
  critique: z.boolean(),
});

export type SetPosteCritiqueInput = z.infer<typeof setPosteCritiqueSchema>;
