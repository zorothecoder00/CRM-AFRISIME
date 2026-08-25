import { z } from "zod";

// ---- Procurement Plan (Project Studio §34) ----

const PROCUREMENT_STATUTS = ["BESOIN_IDENTIFIE", "EN_COURS", "COMMANDE", "LIVRE", "ANNULE"] as const;

export const createProcurementItemSchema = z.object({
  projectId: z.string().min(1),
  besoin: z.string().min(2, "Le besoin est requis."),
  specifications: z.string().optional(),
  quantite: z.string().optional(),
  budget: z.string().optional(),
  fournisseurId: z.string().min(1).optional(),
  methodeAchat: z.string().optional(),
  echeance: z.string().optional(),
});

export type CreateProcurementItemInput = z.infer<typeof createProcurementItemSchema>;

export const updateProcurementItemStatutSchema = z.object({
  procurementItemId: z.string().min(1),
  statut: z.enum(PROCUREMENT_STATUTS),
});

export type UpdateProcurementItemStatutInput = z.infer<typeof updateProcurementItemStatutSchema>;

export const deleteProcurementItemSchema = z.object({ procurementItemId: z.string().min(1) });

export type DeleteProcurementItemInput = z.infer<typeof deleteProcurementItemSchema>;
