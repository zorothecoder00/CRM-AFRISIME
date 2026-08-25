import { z } from "zod";

// ---- Change Request Management (Project Studio §31) ----
// Distinct du modele ChangeRequest existant (gestion du changement
// organisationnel RH/communication) : ceci concerne une modification d'un
// projet en cours (budget/calendrier/perimetre) a faire approuver.

export const createProjectChangeRequestSchema = z.object({
  projectId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  budgetPropose: z.string().optional(),
  dateFinProposee: z.string().optional(),
  impactRessources: z.string().optional(),
  impactRisques: z.string().optional(),
  impactResultats: z.string().optional(),
});

export type CreateProjectChangeRequestInput = z.infer<typeof createProjectChangeRequestSchema>;

const DECISIONS = ["APPROUVE", "REJETE", "MODIFICATION_DEMANDEE"] as const;

export const decideProjectChangeRequestSchema = z.object({
  changeRequestId: z.string().min(1),
  decision: z.enum(DECISIONS),
  commentaireDecision: z.string().optional(),
});

export type DecideProjectChangeRequestInput = z.infer<typeof decideProjectChangeRequestSchema>;
