import { z } from "zod";

export const createCompetenceSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  categorie: z.string().optional(),
});

export type CreateCompetenceInput = z.infer<typeof createCompetenceSchema>;

export const assignCompetenceSchema = z.object({
  competenceId: z.string().min(1),
  niveau: z.enum(["DEBUTANT", "INTERMEDIAIRE", "AVANCE", "EXPERT"]),
  notes: z.string().optional(),
});

export type AssignCompetenceInput = z.infer<typeof assignCompetenceSchema>;
