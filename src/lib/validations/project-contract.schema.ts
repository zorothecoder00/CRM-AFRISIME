import { z } from "zod";

// ---- Contract Management (Project Studio §35) ----
// Projet -> Contrat -> Fournisseur -> Livrables -> Paiements -> Evaluation.

const CONTRACT_STATUTS = ["ACTIF", "EXPIRE", "RESILIE"] as const;

export const createProjectContractSchema = z.object({
  projectId: z.string().min(1),
  fournisseurId: z.string().min(1, "Le fournisseur est requis."),
  nom: z.string().min(2, "Le nom du contrat est requis."),
  montant: z.string().optional(),
  dateSignature: z.string().optional(),
  dateExpiration: z.string().optional(),
});

export type CreateProjectContractInput = z.infer<typeof createProjectContractSchema>;

export const updateProjectContractStatutSchema = z.object({
  contractId: z.string().min(1),
  statut: z.enum(CONTRACT_STATUTS),
});

export type UpdateProjectContractStatutInput = z.infer<typeof updateProjectContractStatutSchema>;

export const evaluateProjectContractSchema = z.object({
  contractId: z.string().min(1),
  evaluationNote: z.coerce.number().int().min(0).max(5),
  evaluationCommentaire: z.string().optional(),
});

export type EvaluateProjectContractInput = z.infer<typeof evaluateProjectContractSchema>;

export const linkDeliverableToContractSchema = z.object({
  contractId: z.string().min(1),
  deliverableId: z.string().min(1),
});

export type LinkDeliverableToContractInput = z.infer<typeof linkDeliverableToContractSchema>;

const PAYMENT_STATUTS = ["PREVU", "PAYE", "EN_RETARD"] as const;

export const createContractPaymentSchema = z.object({
  contractId: z.string().min(1),
  montant: z.string().min(1, "Le montant est requis."),
  datePaiement: z.string().optional(),
  statut: z.enum(PAYMENT_STATUTS).default("PREVU"),
  reference: z.string().optional(),
});

export type CreateContractPaymentInput = z.infer<typeof createContractPaymentSchema>;

export const updateContractPaymentStatutSchema = z.object({
  paymentId: z.string().min(1),
  statut: z.enum(PAYMENT_STATUTS),
});

export type UpdateContractPaymentStatutInput = z.infer<typeof updateContractPaymentStatutSchema>;
