import { z } from "zod";

// Bug de production (PrismaClientKnownRequestError P2020 "numeric field
// overflow") — User.capaciteHebdomadaireHeures est un Decimal(5,2)
// (max 999.99) mais rien ne bornait la saisie avant l'écriture en base ;
// une valeur trop grande (ex. tapée par erreur) faisait planter la requête
// au lieu d'un message clair. 168h = une semaine complète (7 × 24h),
// plafond physique large plutôt qu'une limite arbitraire plus stricte.
export const updateCapacitySchema = z.object({
  userId: z.string().min(1),
  capaciteHebdomadaireHeures: z
    .string()
    .min(1, "La capacité est requise.")
    .refine((v) => !Number.isNaN(Number(v)), { message: "Valeur numérique invalide." })
    .refine((v) => Number(v) > 0 && Number(v) <= 168, {
      message: "La capacité doit être comprise entre 0 et 168 heures (une semaine complète).",
    }),
});

export type UpdateCapacityInput = z.infer<typeof updateCapacitySchema>;
