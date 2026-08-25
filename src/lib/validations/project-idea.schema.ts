import { z } from "zod";

// ---- Idée de projet (Project Studio §4) ----

const PROJECT_IDEA_STATUSES = [
  "IDEE",
  "A_ETUDIER",
  "ETUDE_FAISABILITE",
  "APPROUVEE",
  "EN_CONCEPTION",
  "PROJET_CREE",
  "REJETEE",
  "ARCHIVEE",
] as const;

export const createProjectIdeaSchema = z.object({
  titreProvisoire: z.string().min(2, "Le titre est requis."),
  origine: z.string().optional(),
  probleme: z.string().optional(),
  opportunite: z.string().optional(),
  beneficiaires: z.string().optional(),
  zone: z.string().optional(),
  porteurId: z.string().optional(),
  departmentId: z.string().optional(),
  estimationBudgetaire: z.string().optional(),
  dureeEstimee: z.string().optional(),
  priorite: z.enum(["BASSE", "MOYENNE", "HAUTE", "CRITIQUE"]),
  sourceFinancementPotentielle: z.string().optional(),
});

export type CreateProjectIdeaInput = z.infer<typeof createProjectIdeaSchema>;

export const updateProjectIdeaSchema = z.object({
  ideaId: z.string().min(1),
  titreProvisoire: z.string().min(2, "Le titre est requis."),
  origine: z.string().optional(),
  probleme: z.string().optional(),
  opportunite: z.string().optional(),
  beneficiaires: z.string().optional(),
  zone: z.string().optional(),
  porteurId: z.string().optional(),
  departmentId: z.string().optional(),
  estimationBudgetaire: z.string().optional(),
  dureeEstimee: z.string().optional(),
  priorite: z.enum(["BASSE", "MOYENNE", "HAUTE", "CRITIQUE"]),
  sourceFinancementPotentielle: z.string().optional(),
});

export type UpdateProjectIdeaInput = z.infer<typeof updateProjectIdeaSchema>;

export const updateProjectIdeaStatusSchema = z.object({
  ideaId: z.string().min(1),
  statut: z.enum(PROJECT_IDEA_STATUSES),
  motifRejet: z.string().optional(),
});

export type UpdateProjectIdeaStatusInput = z.infer<typeof updateProjectIdeaStatusSchema>;

export const deleteProjectIdeaSchema = z.object({ ideaId: z.string().min(1) });

export type DeleteProjectIdeaInput = z.infer<typeof deleteProjectIdeaSchema>;

// Conversion Idée → Project (Project Studio §4/§5) — déclenchée en marquant
// l'idée "Projet créé" ; distincte de updateProjectIdeaStatus car elle exige
// les champs obligatoires de Project (responsable, département) que l'idée
// ne porte qu'en option.
export const convertProjectIdeaSchema = z.object({
  ideaId: z.string().min(1),
  departmentId: z.string().min(1, "Un département est requis pour créer le projet."),
  responsableId: z.string().min(1, "Un responsable est requis pour créer le projet."),
});

export type ConvertProjectIdeaInput = z.infer<typeof convertProjectIdeaSchema>;
