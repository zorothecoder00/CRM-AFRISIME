import { z } from "zod";

export const confirmMfaSchema = z.object({
  secret: z.string().min(16),
  code: z.string().length(6, "Le code doit comporter 6 chiffres."),
});

export const disableMfaSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis."),
});
