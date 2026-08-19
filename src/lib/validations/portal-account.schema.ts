import { z } from "zod";

export const createPortalAccountSchema = z.object({
  contactId: z.string().min(1),
});

export type CreatePortalAccountInput = z.infer<typeof createPortalAccountSchema>;

// Droits granulaires (cahier des charges V3.0 §25, Ecosystem Management).
export const updatePortalAccountRightsSchema = z.object({
  portalAccountId: z.string().min(1),
  droitProjets: z.boolean(),
  droitDocuments: z.boolean(),
  droitTeleversement: z.boolean(),
  droitMessages: z.boolean(),
});

export type UpdatePortalAccountRightsInput = z.infer<typeof updatePortalAccountRightsSchema>;
