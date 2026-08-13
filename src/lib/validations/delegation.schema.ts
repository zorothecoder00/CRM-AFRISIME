import { z } from "zod";

export const createDelegationSchema = z
  .object({
    delegantId: z.string().min(1, "Le délégant est requis."),
    delegataireId: z.string().min(1, "Le délégataire est requis."),
    motif: z.string().optional(),
    dateDebut: z.string().min(1, "La date de début est requise."),
    dateFin: z.string().min(1, "La date de fin est requise."),
  })
  .refine((data) => data.delegantId !== data.delegataireId, {
    message: "Le délégant et le délégataire doivent être différents.",
    path: ["delegataireId"],
  });

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;

export const deleteDelegationSchema = z.object({ id: z.string().min(1) });

export type DeleteDelegationInput = z.infer<typeof deleteDelegationSchema>;
