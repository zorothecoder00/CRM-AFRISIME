import { z } from "zod";

const createSubtaskSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  responsablePrincipalId: z.string().min(1, "Un responsable est requis."),
  priorite: z.enum(["TRES_HAUTE", "HAUTE", "MOYENNE", "BASSE"]).optional().default("MOYENNE"),
  dateDebut: z.string().optional(),
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
  dateDebut: z.string().optional(),
  echeance: z.string().optional(),
  tempsEstimeHeures: z.string().optional(),
  // Demande utilisateur — uniquement pertinent si cette tâche est elle-même
  // une sous-tâche (parentTaskId non nul) : voir recomputeParentTaskFromSubtasks.
  // Borné 0-100 (comme le champ input) — même classe de bug que le P2020 de
  // capaciteHebdomadaireHeures : Task.poidsAvancement est un Int, une valeur
  // non bornée peut dépasser la plage int32 et planter prisma.task.update.
  poidsAvancement: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
      message: "Le poids doit être compris entre 0 et 100.",
    }),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Ajout d'une sous-tâche à une tâche déjà existante (contrairement à
// CreateTaskInput.subtasks qui n'en crée qu'à la création de la tâche mère) —
// couvre le cas "gérer les sous-tâches en éditant une tâche".
export const addSubtaskSchema = z.object({
  parentTaskId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  responsablePrincipalId: z.string().min(1, "Un responsable est requis."),
  priorite: z.enum(["TRES_HAUTE", "HAUTE", "MOYENNE", "BASSE"]).optional().default("MOYENNE"),
  dateDebut: z.string().optional(),
  echeance: z.string().optional(),
  // Demande utilisateur — poids (%) de cette sous-tâche dans le calcul de
  // l'avancement de la tâche mère ; vide = calcul automatique (moyenne
  // simple), voir recomputeParentTaskFromSubtasks. Borné 0-100 (voir
  // updateTaskSchema ci-dessus pour le pourquoi).
  poidsAvancement: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
      message: "Le poids doit être compris entre 0 et 100.",
    }),
});

export type AddSubtaskInput = z.infer<typeof addSubtaskSchema>;

// Checklist §5 : un élément qui mérite finalement son propre suivi (statut,
// priorité, dates) devient une sous-tâche — transforme, ne duplique pas
// (voir convertChecklistItemToSubtask).
export const convertChecklistItemToSubtaskSchema = z.object({ checklistItemId: z.string().min(1) });

export type ConvertChecklistItemToSubtaskInput = z.infer<typeof convertChecklistItemToSubtaskSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  statut: z.enum(["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE", "TERMINEE", "ANNULEE", "REPORTEE"]),
});

export const updateTaskPrioritySchema = z.object({
  taskId: z.string().min(1),
  priorite: z.enum(["TRES_HAUTE", "HAUTE", "MOYENNE", "BASSE"]),
});

export const addCommentSchema = z.object({
  taskId: z.string().min(1),
  content: z.string().min(1, "Le commentaire ne peut pas être vide."),
});

// Demande de report de date (dateDebut et/ou echeance) — demande utilisateur
// : le responsable principal/les assignes ne peuvent pas modifier ces dates
// directement (voir updateTask), seulement en faire la demande ici.
export const createTaskDateChangeRequestSchema = z
  .object({
    taskId: z.string().min(1),
    requestedDateDebut: z.string().optional(),
    requestedEcheance: z.string().optional(),
    motif: z.string().min(2, "Le motif est requis."),
  })
  .refine((data) => data.requestedDateDebut || data.requestedEcheance, {
    message: "Indiquez au moins une nouvelle date (début ou échéance).",
    path: ["requestedEcheance"],
  });

export type CreateTaskDateChangeRequestInput = z.infer<typeof createTaskDateChangeRequestSchema>;

export const decideTaskDateChangeRequestSchema = z.object({
  requestId: z.string().min(1),
  statut: z.enum(["ACCEPTEE", "REFUSEE"]),
  decisionMotif: z.string().optional(),
});

export type DecideTaskDateChangeRequestInput = z.infer<typeof decideTaskDateChangeRequestSchema>;

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
