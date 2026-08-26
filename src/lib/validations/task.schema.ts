import { z } from "zod";

const createSubtaskSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  responsablePrincipalId: z.string().min(1, "Un responsable est requis."),
  priorite: z.enum(["TRES_HAUTE", "HAUTE", "MOYENNE", "BASSE"]).optional().default("MOYENNE"),
  echeance: z.string().optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Un projet est requis."),
  sectionId: z.string().optional(),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  priorite: z.enum(["TRES_HAUTE", "HAUTE", "MOYENNE", "BASSE"]),
  responsablePrincipalId: z.string().min(1, "Un responsable est requis."),
  assigneeIds: z.array(z.string()).optional().default([]),
  echeance: z.string().optional(),
  tempsEstimeHeures: z.string().optional(),
  // Origines supplementaires (cahier des charges §IX), toutes optionnelles.
  objectiveId: z.string().optional(),
  planId: z.string().optional(),
  // Comble V2.2 §9.2 : jusqu'ici Task.competencesRequises n'était rempli
  // nulle part, donc le critère "compétence" de suggestAssignees restait
  // toujours neutre en pratique.
  competenceIds: z.array(z.string()).optional().default([]),
  // Sous-tâches créées en même temps que la tâche parente (autant que
  // voulu), chacune avec son propre responsable — évite l'aller-retour
  // "créer la tâche puis ouvrir son détail pour ajouter des sous-tâches".
  subtasks: z.array(createSubtaskSchema).optional().default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  id: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  priorite: z.enum(["TRES_HAUTE", "HAUTE", "MOYENNE", "BASSE"]),
  responsablePrincipalId: z.string().min(1, "Un responsable est requis."),
  echeance: z.string().optional(),
  tempsEstimeHeures: z.string().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  statut: z.enum(["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE", "TERMINEE", "ANNULEE"]),
});

export const addCommentSchema = z.object({
  taskId: z.string().min(1),
  content: z.string().min(1, "Le commentaire ne peut pas être vide."),
});

export const addChecklistItemSchema = z.object({
  taskId: z.string().min(1),
  label: z.string().min(1, "Le libellé est requis."),
  responsableId: z.string().optional(),
  echeance: z.string().optional(),
});

export const addDependencySchema = z.object({
  taskId: z.string().min(1),
  dependsOnTaskId: z.string().min(1),
  // Project Studio §18 (Gantt Builder) — type de dependance standard
  // (Finish-to-Start par defaut, voir TaskDependency.type dans schema.prisma).
  type: z.enum(["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH", "START_TO_FINISH"]).optional(),
});

// Project Studio §15 (WBS) — convertit un noeud du WBS (ProjectSection) en tache.
export const convertSectionToTaskSchema = z.object({ sectionId: z.string().min(1) });
export type ConvertSectionToTaskInput = z.infer<typeof convertSectionToTaskSchema>;

export const updateActualTimeSchema = z.object({
  taskId: z.string().min(1),
  tempsReelHeures: z.string().min(1, "La valeur est requise."),
});

export const linkTaskExternalContactSchema = z.object({
  taskId: z.string().min(1),
  externalContactId: z.string().optional(),
});

export type LinkTaskExternalContactInput = z.infer<typeof linkTaskExternalContactSchema>;
