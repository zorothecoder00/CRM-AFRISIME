import { z } from "zod";

export const createObjectiveSchema = z
  .object({
    titre: z.string().min(2, "Le titre est requis."),
    description: z.string().optional(),
    periode: z.enum(["ANNUEL", "TRIMESTRIEL", "MENSUEL", "HEBDOMADAIRE"]),
    scope: z.enum(["ORGANISATION", "INDIVIDUEL", "EQUIPE", "DEPARTEMENT", "PROGRAMME"]),
    dateDebut: z.string().min(1, "La date de début est requise."),
    dateFin: z.string().min(1, "La date de fin est requise."),
    userId: z.string().optional(),
    projectId: z.string().optional(),
    departmentId: z.string().optional(),
    programmeId: z.string().optional(),
    axisId: z.string().optional(),
    parentId: z.string().optional(),
    // Project Studio §13 (Objectives Builder) — chaine Objectif general ->
    // specifique -> Resultat, independante du scope organisationnel ci-dessus.
    niveau: z.enum(["GENERAL", "SPECIFIQUE", "RESULTAT"]).optional(),
  })
  .refine((data) => data.scope !== "INDIVIDUEL" || !!data.userId, {
    message: "Un utilisateur est requis pour un objectif individuel.",
    path: ["userId"],
  })
  .refine((data) => data.scope !== "EQUIPE" || !!data.projectId, {
    message: "Un projet (équipe) est requis pour un objectif d'équipe.",
    path: ["projectId"],
  })
  .refine((data) => data.scope !== "DEPARTEMENT" || !!data.departmentId, {
    message: "Un département est requis pour un objectif de département.",
    path: ["departmentId"],
  })
  .refine((data) => data.scope !== "PROGRAMME" || !!data.programmeId, {
    message: "Un programme est requis pour un objectif de programme.",
    path: ["programmeId"],
  });

export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>;

export const updateObjectiveStatusSchema = z.object({
  objectiveId: z.string().min(1),
  statut: z.enum(["EN_COURS", "ATTEINT", "NON_ATTEINT", "ANNULE"]),
});

export const addIndicatorSchema = z.object({
  objectiveId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  unite: z.string().optional(),
  valeurCible: z.string().min(1, "La valeur cible est requise."),
});

export type AddIndicatorInput = z.infer<typeof addIndicatorSchema>;

export const updateIndicatorValueSchema = z.object({
  indicatorId: z.string().min(1),
  valeurActuelle: z.string().min(1, "La valeur est requise."),
});

export type UpdateIndicatorValueInput = z.infer<typeof updateIndicatorValueSchema>;

export const linkObjectiveParentSchema = z.object({
  objectiveId: z.string().min(1),
  parentId: z.string().optional(),
});

export type LinkObjectiveParentInput = z.infer<typeof linkObjectiveParentSchema>;

// ---- SMART Objectives (Project Studio §14) ----

export const updateObjectiveSmartSchema = z.object({
  objectiveId: z.string().min(1),
  smartSpecifique: z.boolean(),
  smartMesurable: z.boolean(),
  smartAtteignable: z.boolean(),
  smartPertinent: z.boolean(),
  smartTemporel: z.boolean(),
});

export type UpdateObjectiveSmartInput = z.infer<typeof updateObjectiveSmartSchema>;
