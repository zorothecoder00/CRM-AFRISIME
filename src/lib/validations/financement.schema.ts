import { z } from "zod";

// ---- Financement (Project Studio §10 "Budget & financement", enrichi
// §24 "Financement du projet" et §25 "Donor/Bailleur Management") ----

const FINANCEMENT_STATUTS = [
  "IDENTIFIE",
  "SOLLICITE",
  "RECHERCHE",
  "NEGOCIATION",
  "APPROUVE",
  "OBTENU",
  "REFUSE",
  "ANNULE",
] as const;

const FINANCEMENT_SOURCES = [
  "FONDS_PROPRES",
  "SUBVENTION",
  "PRET",
  "INVESTISSEMENT",
  "BAILLEUR",
  "PARTENAIRE",
  "SPONSORING",
  "CONTRIBUTION_NATURE",
] as const;

export const createFinancementSchema = z.object({
  projectId: z.string().min(1),
  bailleur: z.string().min(2, "Le bailleur est requis."),
  montant: z.string().min(1, "Un montant est requis."),
  statut: z.enum(FINANCEMENT_STATUTS),
  source: z.enum(FINANCEMENT_SOURCES).optional(),
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

// ---- Donor/Bailleur Management (§25) — conditions du financement une fois
// le bailleur engagé : convention, période couverte, livrables/rapports dus.
export const updateFinancementDetailsSchema = z.object({
  financementId: z.string().min(1),
  source: z.enum(FINANCEMENT_SOURCES).optional(),
  convention: z.string().optional(),
  periodeDebut: z.string().optional(),
  periodeFin: z.string().optional(),
  conditions: z.string().optional(),
  livrablesRequis: z.string().optional(),
  rapportsRequis: z.string().optional(),
  indicateursImposes: z.string().optional(),
});

export type UpdateFinancementDetailsInput = z.infer<typeof updateFinancementDetailsSchema>;

export const deleteFinancementSchema = z.object({ financementId: z.string().min(1) });

export type DeleteFinancementInput = z.infer<typeof deleteFinancementSchema>;
