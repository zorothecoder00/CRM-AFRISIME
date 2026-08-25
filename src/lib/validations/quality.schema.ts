import { z } from "zod";

// ---- Quality Management (Project Studio §33) ----
// Reutilise QualityDocument (Quality Plan, type PLAN_QUALITE) et
// QualityControl (deja existants) plutot que de nouveaux modeles.

export const upsertQualityPlanSchema = z.object({
  projectId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  contenu: z.string().optional(),
});

export type UpsertQualityPlanInput = z.infer<typeof upsertQualityPlanSchema>;

export const publishQualityPlanSchema = z.object({ documentId: z.string().min(1) });

export type PublishQualityPlanInput = z.infer<typeof publishQualityPlanSchema>;

const RESULTATS = ["CONFORME", "NON_CONFORME"] as const;

export const createQualityControlSchema = z.object({
  projectId: z.string().min(1),
  deliverableId: z.string().min(1).optional(),
  titre: z.string().min(2, "Le critère contrôlé est requis."),
  resultat: z.enum(RESULTATS),
  commentaire: z.string().optional(),
  nonConformite: z.string().optional(),
  actionCorrective: z.string().optional(),
  responsableId: z.string().min(1).optional(),
});

export type CreateQualityControlInput = z.infer<typeof createQualityControlSchema>;
