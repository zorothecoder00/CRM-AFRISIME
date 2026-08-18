import { z } from "zod";

export const createApiKeySchema = z.object({
  nom: z.string().min(1, "Nom requis.").max(80),
  permissions: z.array(z.string()).min(1, "Sélectionnez au moins une permission."),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
