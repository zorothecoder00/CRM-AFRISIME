import { z } from "zod";

export const COMPLIANCE_OBLIGATION_TYPES = ["REGLEMENTAIRE", "CONTRACTUELLE"] as const;
export const COMPLIANCE_OBLIGATION_STATUTS = ["A_VENIR", "A_JOUR", "EN_RETARD", "NON_CONFORME"] as const;

export const createComplianceObligationSchema = z.object({
  code: z.string().optional(),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  type: z.enum(COMPLIANCE_OBLIGATION_TYPES),
  echeance: z.string().optional(),
  responsableId: z.string().optional(),
});

export type CreateComplianceObligationInput = z.infer<typeof createComplianceObligationSchema>;

export const updateComplianceObligationStatutSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(COMPLIANCE_OBLIGATION_STATUTS),
});

export type UpdateComplianceObligationStatutInput = z.infer<typeof updateComplianceObligationStatutSchema>;

export const addComplianceControlSchema = z.object({
  obligationId: z.string().min(1),
  resultat: z.enum(["CONFORME", "NON_CONFORME"]),
  commentaire: z.string().optional(),
});

export type AddComplianceControlInput = z.infer<typeof addComplianceControlSchema>;
