import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  // Revue de robustesse (2026-09-11) — un champ absent (pas juste vide)
  // déclenche le message par défaut de Zod ("Required", en anglais) au lieu
  // du message personnalisé, qui ne s'applique qu'une fois le type vérifié.
  token: z.string({ required_error: "Token requis." }).min(1, "Token requis."),
  password: z.string({ required_error: "8 caractères minimum." }).min(8, "8 caractères minimum."),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
