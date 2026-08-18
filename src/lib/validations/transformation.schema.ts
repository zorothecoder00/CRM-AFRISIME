import { z } from "zod";

export const TRANSFORMATION_TYPES = [
  "DIGITALE",
  "RESTRUCTURATION",
  "EXPANSION_GEOGRAPHIQUE",
  "CHANGEMENT_ORGANISATIONNEL",
  "FUSION",
  "ACQUISITION",
  "LANCEMENT_ACTIVITE",
] as const;

export const TRANSFORMATION_PHASES = ["DIAGNOSTIC", "PLAN", "TRANSFORMATION", "ADOPTION", "MESURE", "AMELIORATION"] as const;

export const createTransformationSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  type: z.enum(TRANSFORMATION_TYPES),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  responsableId: z.string().min(1, "Un responsable est requis."),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
});

export type CreateTransformationInput = z.infer<typeof createTransformationSchema>;

export const updateTransformationPhaseSchema = z.object({
  id: z.string().min(1),
  phase: z.enum(TRANSFORMATION_PHASES),
  // Bilan de cloture (V3.0 §17/§18 — mémoire organisationnelle), demandé
  // uniquement quand phase === "AMELIORATION" (fin du cycle).
  bilan: z.string().optional(),
});

export type UpdateTransformationPhaseInput = z.infer<typeof updateTransformationPhaseSchema>;

export const cancelTransformationSchema = z.object({
  id: z.string().min(1),
  motif: z.string().optional(),
});

export type CancelTransformationInput = z.infer<typeof cancelTransformationSchema>;
