import { z } from "zod";

export const portalLoginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export type PortalLoginInput = z.infer<typeof portalLoginSchema>;

export const portalActivateSchema = z.object({
  token: z.string().min(1, "Token requis."),
  password: z.string().min(8, "8 caractères minimum."),
});

export type PortalActivateInput = z.infer<typeof portalActivateSchema>;
