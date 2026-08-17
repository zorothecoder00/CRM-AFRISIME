import { z } from "zod";

export const createContractSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  opportunityId: z.string().optional(),
  organizationId: z.string().optional(),
  montant: z.string().optional(),
  dateSignature: z.string().optional(),
  dateExpiration: z.string().optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
