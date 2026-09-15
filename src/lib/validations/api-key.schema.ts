import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Seules ces permissions sont réellement vérifiées quelque part — les 3
 * routes /api/v1/* (voir apiKeyHasPermission dans src/lib/api-keys.ts) sont
 * la seule surface qui lit key.permissions. Cocher autre chose (ex.
 * ADMINISTRATION_USERS_MANAGE) serait accepté sans erreur mais totalement
 * inerte, trompeur pour l'admin qui croirait accorder un accès réel.
 * Toute nouvelle route /api/v1/* doit ajouter sa permission ici pour
 * devenir sélectionnable.
 */
export const API_KEY_PERMISSIONS = [PERMISSIONS.PROJECT_READ, PERMISSIONS.TASK_READ, PERMISSIONS.REPORT_EXPORT] as const;

export const createApiKeySchema = z.object({
  nom: z.string().min(1, "Nom requis.").max(80),
  permissions: z.array(z.enum(API_KEY_PERMISSIONS)).min(1, "Sélectionnez au moins une permission."),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
