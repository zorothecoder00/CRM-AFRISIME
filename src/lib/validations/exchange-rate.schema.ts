import { z } from "zod";

export const upsertExchangeRateSchema = z.object({
  fromDevise: z.string().min(1, "La devise source est requise.").max(10),
  toDevise: z.string().min(1, "La devise cible est requise.").max(10),
  taux: z.string().min(1, "Le taux est requis."),
});

export type UpsertExchangeRateInput = z.infer<typeof upsertExchangeRateSchema>;

export const deleteExchangeRateSchema = z.object({ id: z.string().min(1) });

export type DeleteExchangeRateInput = z.infer<typeof deleteExchangeRateSchema>;
