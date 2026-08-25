import { z } from "zod";

// ---- Financement (Project Studio §10 "Budget & financement") ----

const FINANCEMENT_STATUTS = ["RECHERCHE", "NEGOCIATION", "OBTENU", "REFUSE", "ANNULE"] as const;

export const createFinancementSchema = z.object({
  projectId: z.string().min(1),
  bailleur: z.string().min(2, "Le bailleur est requis."),
  montant: z.string().min(1, "Un montant est requis."),
  statut: z.enum(FINANCEMENT_STATUTS),
  dateObtention: z.string().optional(),
  dateEcheance: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateFinancementInput = z.infer<typeof createFinancementSchema>;

export const updateFinancementStatutSchema = z.object({
  financementId: z.string().min(1),
  statut: z.enum(FINANCEMENT_STATUTS),
  dateObtention: z.string().optional(),
});

export type UpdateFinancementStatutInput = z.infer<typeof updateFinancementStatutSchema>;

export const deleteFinancementSchema = z.object({ financementId: z.string().min(1) });

export type DeleteFinancementInput = z.infer<typeof deleteFinancementSchema>;
