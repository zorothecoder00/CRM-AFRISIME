import { z } from "zod";

export const updateCapacitySchema = z.object({
  userId: z.string().min(1),
  capaciteHebdomadaireHeures: z.string().min(1, "La capacité est requise."),
});

export type UpdateCapacityInput = z.infer<typeof updateCapacitySchema>;
