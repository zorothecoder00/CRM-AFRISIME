import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(1, "Le code est requis."),
  parentId: z.string().optional(),
  // Rattachement multi-entites (cahier des charges V2.2 §22) — uniquement
  // significatif quand parentId est vide (departement racine), ignore sinon.
  entityId: z.string().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.extend({
  id: z.string().min(1),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
