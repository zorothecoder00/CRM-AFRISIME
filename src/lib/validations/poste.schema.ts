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
