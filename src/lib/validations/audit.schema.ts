import { z } from "zod";

export const createAuditPlanSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
  perimetre: z.string().optional(),
  objectifs: z.string().optional(),
  criteres: z.string().optional(),
});

export type CreateAuditPlanInput = z.infer<typeof createAuditPlanSchema>;

export const updateAuditPlanSchema = createAuditPlanSchema.extend({
  planId: z.string().min(1),
});

export type UpdateAuditPlanInput = z.infer<typeof updateAuditPlanSchema>;

export const addAuditPlanMemberSchema = z.object({
  planId: z.string().min(1),
  userId: z.string().min(1),
});

export type AddAuditPlanMemberInput = z.infer<typeof addAuditPlanMemberSchema>;

export const addAuditPlanDocumentSchema = z.object({
  planId: z.string().min(1),
  nom: z.string().min(1, "Le nom est requis."),
  url: z.string().min(1, "Le fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
});

export type AddAuditPlanDocumentInput = z.infer<typeof addAuditPlanDocumentSchema>;

export const createAuditMissionSchema = z.object({
  planId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
});

export type CreateAuditMissionInput = z.infer<typeof createAuditMissionSchema>;

export const updateAuditMissionSchema = z.object({
  missionId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  statut: z.enum(["PREPARATION", "COLLECTE", "VERIFICATION", "RAPPORT", "CLOTUREE"]),
  rapport: z.string().optional(),
});

export type UpdateAuditMissionInput = z.infer<typeof updateAuditMissionSchema>;

export const createAuditFindingSchema = z.object({
  missionId: z.string().min(1),
  constat: z.string().min(2, "Le constat est requis."),
  recommandation: z.string().optional(),
  responsableId: z.string().optional(),
  echeance: z.string().optional(),
});

export type CreateAuditFindingInput = z.infer<typeof createAuditFindingSchema>;

export const updateAuditFindingSchema = createAuditFindingSchema.extend({
  findingId: z.string().min(1),
  statut: z.enum(["OUVERT", "EN_COURS", "TRAITE", "CLOS"]),
});

export type UpdateAuditFindingInput = z.infer<typeof updateAuditFindingSchema>;
