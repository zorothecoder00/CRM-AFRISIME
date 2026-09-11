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
  })
  // Revue de robustesse (2026-09-11) — une délégation qui finit avant de
  // commencer était acceptée silencieusement.
  .refine((data) => new Date(data.dateFin) > new Date(data.dateDebut), {
    message: "La date de fin doit être postérieure à la date de début.",
    path: ["dateFin"],
  });

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;

export const deleteDelegationSchema = z.object({ id: z.string().min(1) });

export type DeleteDelegationInput = z.infer<typeof deleteDelegationSchema>;
