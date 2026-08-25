import { z } from "zod";

// ---- Appel à projets / Funding Opportunity (Project Studio §26) ----
// Peut exister avant tout projet (pipeline d'opportunites a suivre) — projectId optionnel.

export const createFundingOpportunitySchema = z.object({
  projectId: z.string().min(1).optional(),
  bailleur: z.string().min(2, "Le bailleur est requis."),
  deadline: z.string().optional(),
  budgetDisponible: z.string().optional(),
  paysEligibles: z.string().optional(),
  secteurs: z.string().optional(),
  beneficiaires: z.string().optional(),
  criteres: z.string().optional(),
  documents: z.string().optional(),
  exigences: z.string().optional(),
});

export type CreateFundingOpportunityInput = z.infer<typeof createFundingOpportunitySchema>;

export const linkFundingOpportunityToProjectSchema = z.object({
  fundingOpportunityId: z.string().min(1),
  projectId: z.string().min(1),
});

export type LinkFundingOpportunityToProjectInput = z.infer<typeof linkFundingOpportunityToProjectSchema>;

export const deleteFundingOpportunitySchema = z.object({ fundingOpportunityId: z.string().min(1) });

export type DeleteFundingOpportunityInput = z.infer<typeof deleteFundingOpportunitySchema>;
