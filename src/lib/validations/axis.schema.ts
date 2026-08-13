import { z } from "zod";

export const createAxisSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  priorite: z.enum(["BASSE", "MOYENNE", "HAUTE", "CRITIQUE"]),
});

export type CreateAxisInput = z.infer<typeof createAxisSchema>;

export const updateAxisSchema = createAxisSchema.extend({
  id: z.string().min(1),
});

export type UpdateAxisInput = z.infer<typeof updateAxisSchema>;

export const deleteAxisSchema = z.object({ id: z.string().min(1) });

export type DeleteAxisInput = z.infer<typeof deleteAxisSchema>;
