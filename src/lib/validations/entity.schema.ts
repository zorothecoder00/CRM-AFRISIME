import { z } from "zod";

export const createEntitySchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  code: z.string().min(1, "Le code est requis."),
  parentId: z.string().optional(),
  pays: z.string().optional(),
  devise: z.string().optional(),
  fuseauHoraire: z.string().optional(),
  langue: z.string().optional(),
  reglementations: z.string().optional(),
  parametresLocaux: z.string().optional(),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;

export const updateEntitySchema = createEntitySchema.extend({
  id: z.string().min(1),
});

export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;

export const createHolidaySchema = z.object({
  entityId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  date: z.string().min(1, "La date est requise."),
  recurrenceAnnuelle: z.boolean().default(true),
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
