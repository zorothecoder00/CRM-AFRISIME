import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  email: z.string().email("Email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
  roleId: z.string().min(1, "Un rôle est requis."),
  departmentId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
