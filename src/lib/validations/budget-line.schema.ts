import { z } from "zod";

// ---- Budget Builder (Project Studio §22-23) ----

const budgetCategorieEnum = z.enum([
  "PERSONNEL",
  "EQUIPEMENT",
  "TRANSPORT",
  "FORMATION",
  "COMMUNICATION",
  "PRESTATIONS",
  "ACHATS",
  "LOGISTIQUE",
  "FONCTIONNEMENT",
  "IMPREVUS",
]);

export const createBudgetLineSchema = z.object({
  projectId: z.string().min(1),
  sectionId: z.string().min(1).optional(),
  categorie: budgetCategorieEnum,
  libelle: z.string().min(2, "Le libellé doit contenir au moins 2 caractères."),
  montantPrevu: z.coerce.number().nonnegative(),
});

export type CreateBudgetLineInput = z.infer<typeof createBudgetLineSchema>;

export const updateBudgetLineRealisationSchema = z.object({
  budgetLineId: z.string().min(1),
  montantEngage: z.coerce.number().nonnegative().optional(),
  montantPaye: z.coerce.number().nonnegative().optional(),
});

export type UpdateBudgetLineRealisationInput = z.infer<typeof updateBudgetLineRealisationSchema>;

export const deleteBudgetLineSchema = z.object({ budgetLineId: z.string().min(1) });

export type DeleteBudgetLineInput = z.infer<typeof deleteBudgetLineSchema>;
