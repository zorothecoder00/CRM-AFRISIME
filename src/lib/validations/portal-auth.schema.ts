import { z } from "zod";

export const portalLoginSchema = z.object({
  email: z.string({ required_error: "Email invalide." }).email("Email invalide."),
  password: z.string({ required_error: "Mot de passe requis." }).min(1, "Mot de passe requis."),
});

export type PortalLoginInput = z.infer<typeof portalLoginSchema>;

export const portalActivateSchema = z.object({
  // Revue de robustesse (2026-09-11) — voir auth.schema.ts (même correctif).
  token: z.string({ required_error: "Token requis." }).min(1, "Token requis."),
  password: z.string({ required_error: "8 caractères minimum." }).min(8, "8 caractères minimum."),
});

export type PortalActivateInput = z.infer<typeof portalActivateSchema>;
