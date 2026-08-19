import { z } from "zod";

export const SUCCESSION_PLAN_STATUTS = ["EN_PREPARATION", "PRET", "ACTIF"] as const;
export const POTENTIEL_NIVEAUX = ["FAIBLE", "MOYEN", "ELEVE"] as const;

export const createSuccessionPlanSchema = z.object({
  posteId: z.string().min(1, "Le poste est requis."),
  titulaireId: z.string().optional(),
  competencesRequises: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateSuccessionPlanInput = z.infer<typeof createSuccessionPlanSchema>;

export const updateSuccessionPlanSchema = z.object({
  id: z.string().min(1),
  titulaireId: z.string().optional(),
  competencesRequises: z.string().optional(),
  statut: z.enum(SUCCESSION_PLAN_STATUTS),
  notes: z.string().optional(),
});

export type UpdateSuccessionPlanInput = z.infer<typeof updateSuccessionPlanSchema>;

export const addSuccessionCandidateSchema = z.object({
  successionPlanId: z.string().min(1),
  userId: z.string().min(1, "Le candidat est requis."),
  potentiel: z.enum(POTENTIEL_NIVEAUX),
  pretDans: z.string().optional(),
  notes: z.string().optional(),
});

export type AddSuccessionCandidateInput = z.infer<typeof addSuccessionCandidateSchema>;

export const idSchema = z.object({ id: z.string().min(1) });
export type IdInput = z.infer<typeof idSchema>;
