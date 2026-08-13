import { z } from "zod";

export const createPlanSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  niveau: z.enum(["STRATEGIQUE", "ANNUEL", "TRIMESTRIEL", "MENSUEL"]),
  description: z.string().optional(),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
  budgetIndicatif: z.string().optional(),
  priorites: z.string().optional(),
  axisId: z.string().optional(),
  departmentId: z.string().optional(),
  parentId: z.string().optional(),
  ownerId: z.string().min(1, "Un responsable est requis."),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.extend({
  id: z.string().min(1),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const linkObjectiveToPlanSchema = z.object({
  objectiveId: z.string().min(1),
  planId: z.string().optional(),
});

export type LinkObjectiveToPlanInput = z.infer<typeof linkObjectiveToPlanSchema>;

export const linkProgrammeToPlanSchema = z.object({
  programmeId: z.string().min(1),
  planId: z.string().optional(),
});

export type LinkProgrammeToPlanInput = z.infer<typeof linkProgrammeToPlanSchema>;
