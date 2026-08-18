import { z } from "zod";

export const createDecisionMatrixSchema = z.object({
  titre: z.string().min(2, "Titre requis."),
  contexte: z.string().optional(),
  projectId: z.string().optional(),
});
export type CreateDecisionMatrixInput = z.infer<typeof createDecisionMatrixSchema>;

export const updateWeightsSchema = z.object({
  matrixId: z.string(),
  poidsCout: z.number().min(0).max(100),
  poidsDelai: z.number().min(0).max(100),
  poidsRisque: z.number().min(0).max(100),
  poidsImpact: z.number().min(0).max(100),
  poidsRessources: z.number().min(0).max(100),
  poidsRoi: z.number().min(0).max(100),
  poidsFaisabilite: z.number().min(0).max(100),
});
export type UpdateWeightsInput = z.infer<typeof updateWeightsSchema>;

const optionNumber = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : Number(v)));

export const createDecisionOptionSchema = z.object({
  matrixId: z.string(),
  nom: z.string().min(1, "Nom requis."),
  description: z.string().optional(),
  cout: optionNumber,
  delaiJours: optionNumber,
  risque: z.enum(["FAIBLE", "MOYEN", "ELEVE"]).default("MOYEN"),
  impact: z.enum(["FAIBLE", "MOYEN", "ELEVE"]).default("MOYEN"),
  ressources: optionNumber,
  roiPercent: optionNumber,
  faisabilite: z.enum(["FAIBLE", "MOYEN", "ELEVE"]).default("MOYEN"),
});
export type CreateDecisionOptionInput = z.infer<typeof createDecisionOptionSchema>;
