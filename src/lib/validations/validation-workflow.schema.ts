import { z } from "zod";

const ROLE_KEYS = [
  "SUPER_ADMIN",
  "DIRECTEUR_GENERAL",
  "DIRECTEUR",
  "CHEF_DEPARTEMENT",
  "CHEF_PROJET",
  "RESPONSABLE",
  "MANAGER",
  "COLLABORATEUR",
  "CONSULTANT_EXTERNE",
  "PRESTATAIRE",
  "INVITE",
] as const;

const ADMIN_REQUEST_TYPES = ["ACHAT", "MISSION", "DECAISSEMENT", "MATERIEL", "AUTORISATION", "RECRUTEMENT", "AUTRE"] as const;

export const createValidationWorkflowSchema = z
  .object({
    nom: z.string().min(2, "Le nom est requis."),
    entityType: z.enum(["TASK", "ADMIN_REQUEST"]),
    // Condition de selection du circuit (cahier des charges §VIII) —
    // ignores si entityType=TASK.
    adminRequestType: z.enum(ADMIN_REQUEST_TYPES).optional(),
    montantMin: z.string().optional(),
    // Action automatique a l'approbation complete (cahier des charges §VIII).
    creerTacheAlApprobation: z.boolean().default(false),
    autoTaskProjectId: z.string().optional(),
    steps: z
      .array(
        z.object({
          approverRole: z.enum(ROLE_KEYS),
          label: z.string().optional(),
          escaladeJours: z.string().optional(),
          escaladeRole: z.enum(ROLE_KEYS).optional(),
        })
      )
      .min(1, "Au moins une étape est requise."),
  })
  .refine((data) => !data.creerTacheAlApprobation || !!data.autoTaskProjectId, {
    message: "Un projet d'accueil est requis pour créer une tâche automatiquement.",
    path: ["autoTaskProjectId"],
  });

export type CreateValidationWorkflowInput = z.infer<typeof createValidationWorkflowSchema>;

export const decideApprovalSchema = z.object({
  taskId: z.string().min(1),
  approved: z.boolean(),
  commentaire: z.string().optional(),
});

export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
