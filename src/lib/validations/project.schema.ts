import { z } from "zod";

export const createProjectSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  objectif: z.string().optional(),
  responsableId: z.string().min(1, "Un responsable est requis."),
  departmentId: z.string().min(1, "Un département est requis."),
  priorite: z.enum(["BASSE", "MOYENNE", "HAUTE", "CRITIQUE"]),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  budget: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createSectionSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().optional(),
  type: z.enum(["PHASE", "SOUS_PHASE", "LOT"]),
  nom: z.string().min(2, "Le nom est requis."),
  responsableId: z.string().optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
