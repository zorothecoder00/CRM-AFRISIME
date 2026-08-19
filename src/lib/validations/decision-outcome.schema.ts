import { z } from "zod";

export const createDecisionOutcomeSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  dateDecision: z.string().min(1, "La date de décision est requise."),
});

export type CreateDecisionOutcomeInput = z.infer<typeof createDecisionOutcomeSchema>;

export const evaluateDecisionOutcomeSchema = z.object({
  id: z.string().min(1),
  objectifAtteint: z.boolean(),
  coutReel: z.number().optional(),
  delaiJours: z.number().int().optional(),
  performance: z.string().optional(),
  incidents: z.string().optional(),
  roiPercent: z.number().optional(),
  enseignements: z.string().optional(),
});

export type EvaluateDecisionOutcomeInput = z.infer<typeof evaluateDecisionOutcomeSchema>;
