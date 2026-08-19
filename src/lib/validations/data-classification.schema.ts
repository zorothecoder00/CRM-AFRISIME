import { z } from "zod";

export const DATA_CLASSIFICATION_LEVELS = ["PUBLIC", "INTERNE", "CONFIDENTIEL", "RESTREINT"] as const;
export const DATA_SENSITIVITIES = ["NORMALE", "PERSONNELLE", "FINANCIERE", "STRATEGIQUE"] as const;
export const DATA_QUALITY_NIVEAUX = ["NON_EVALUEE", "FAIBLE", "MOYENNE", "BONNE", "EXCELLENTE"] as const;

export const classifyDataSchema = z.object({
  entityType: z.literal("Document"),
  entityId: z.string().min(1),
  niveau: z.enum(DATA_CLASSIFICATION_LEVELS),
  sensibilite: z.enum(DATA_SENSITIVITIES),
  qualite: z.enum(DATA_QUALITY_NIVEAUX),
  proprietaireId: z.string().optional(),
  notes: z.string().optional(),
});

export type ClassifyDataInput = z.infer<typeof classifyDataSchema>;
