import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis."),
  password: z.string().min(8, "8 caractères minimum."),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
