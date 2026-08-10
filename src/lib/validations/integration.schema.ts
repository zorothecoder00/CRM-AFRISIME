import { z } from "zod";

export const createIntegrationSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  type: z.enum(["AFRIGES", "M365", "WHATSAPP", "AUTRE"]),
  apiKey: z.string().optional(),
  webhookUrl: z.string().optional(),
  description: z.string().optional(),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;

export const updateIntegrationStatusSchema = z.object({
  integrationId: z.string().min(1),
  statut: z.enum(["CONNECTE", "DECONNECTE", "ERREUR"]),
});
