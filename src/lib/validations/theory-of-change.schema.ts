import { z } from "zod";

// ---- Theory of Change (Project Studio §11) ----

const theoryOfChangeLevelEnum = z.enum(["INPUT", "ACTIVITE", "OUTPUT", "OUTCOME", "IMPACT"]);

export const createTheoryOfChangeNodeSchema = z.object({
  projectId: z.string().min(1),
  niveau: theoryOfChangeLevelEnum,
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  hypotheses: z.string().optional(),
  risques: z.string().optional(),
  conditions: z.string().optional(),
  indicateurs: z.string().optional(),
  sourcesVerification: z.string().optional(),
});

export type CreateTheoryOfChangeNodeInput = z.infer<typeof createTheoryOfChangeNodeSchema>;

export const updateTheoryOfChangeNodeSchema = z.object({
  nodeId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  hypotheses: z.string().optional(),
  risques: z.string().optional(),
  conditions: z.string().optional(),
  indicateurs: z.string().optional(),
  sourcesVerification: z.string().optional(),
});

export type UpdateTheoryOfChangeNodeInput = z.infer<typeof updateTheoryOfChangeNodeSchema>;

export const deleteTheoryOfChangeNodeSchema = z.object({ nodeId: z.string().min(1) });

export type DeleteTheoryOfChangeNodeInput = z.infer<typeof deleteTheoryOfChangeNodeSchema>;
