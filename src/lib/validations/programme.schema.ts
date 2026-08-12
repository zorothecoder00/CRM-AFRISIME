import { z } from "zod";

export const createProgrammeSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  objectif: z.string().optional(),
  responsableId: z.string().min(1, "Un responsable est requis."),
  statut: z.enum(["PLANIFIE", "EN_COURS", "EN_PAUSE", "TERMINE", "ANNULE"]).optional(),
  budget: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
});

export type CreateProgrammeInput = z.infer<typeof createProgrammeSchema>;

export const updateProgrammeSchema = createProgrammeSchema.extend({
  id: z.string().min(1),
});

export type UpdateProgrammeInput = z.infer<typeof updateProgrammeSchema>;

/** projectId sans programmeId = detachement du programme actuel. */
export const linkProjectToProgrammeSchema = z.object({
  projectId: z.string().min(1),
  programmeId: z.string().optional(),
});

export type LinkProjectToProgrammeInput = z.infer<typeof linkProjectToProgrammeSchema>;
