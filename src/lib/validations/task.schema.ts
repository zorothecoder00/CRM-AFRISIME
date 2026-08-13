import { z } from "zod";

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
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

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
});

export const addDependencySchema = z.object({
  taskId: z.string().min(1),
  dependsOnTaskId: z.string().min(1),
});

export const updateActualTimeSchema = z.object({
  taskId: z.string().min(1),
  tempsReelHeures: z.string().min(1, "La valeur est requise."),
});

export const linkTaskExternalContactSchema = z.object({
  taskId: z.string().min(1),
  externalContactId: z.string().optional(),
});

export type LinkTaskExternalContactInput = z.infer<typeof linkTaskExternalContactSchema>;
