import { z } from "zod";

// ---- Assumption Register (Project Studio §29) ----

const assumptionStatusEnum = z.enum(["VALIDE", "INCERTAINE", "INVALIDEE"]);

export const createAssumptionSchema = z.object({
  projectId: z.string().min(1),
  hypothese: z.string().min(2, "L'hypothèse est requise."),
  statut: assumptionStatusEnum.default("INCERTAINE"),
  notes: z.string().optional(),
});

export type CreateAssumptionInput = z.infer<typeof createAssumptionSchema>;

export const updateAssumptionStatusSchema = z.object({
  assumptionId: z.string().min(1),
  statut: assumptionStatusEnum,
});

export type UpdateAssumptionStatusInput = z.infer<typeof updateAssumptionStatusSchema>;

export const deleteAssumptionSchema = z.object({ assumptionId: z.string().min(1) });

export type DeleteAssumptionInput = z.infer<typeof deleteAssumptionSchema>;
