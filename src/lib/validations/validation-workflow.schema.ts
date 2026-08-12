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

export const createValidationWorkflowSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  entityType: z.enum(["TASK", "ADMIN_REQUEST"]),
  steps: z
    .array(
      z.object({
        approverRole: z.enum(ROLE_KEYS),
        label: z.string().optional(),
      })
    )
    .min(1, "Au moins une étape est requise."),
});

export type CreateValidationWorkflowInput = z.infer<typeof createValidationWorkflowSchema>;

export const decideApprovalSchema = z.object({
  taskId: z.string().min(1),
  approved: z.boolean(),
  commentaire: z.string().optional(),
});

export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
