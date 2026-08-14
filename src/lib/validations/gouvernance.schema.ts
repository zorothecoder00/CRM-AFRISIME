import { z } from "zod";

export const governanceInstanceTypeSchema = z.enum([
  "CONSEIL_ADMINISTRATION",
  "COMITE_DIRECTION",
  "COMITE_PILOTAGE",
  "COMITE_TECHNIQUE",
  "COMMISSION",
  "GROUPE_TRAVAIL",
  "COMITE_AD_HOC",
  "AUTRE",
]);

export const createInstanceSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  type: governanceInstanceTypeSchema.default("AUTRE"),
  description: z.string().optional(),
});

export type CreateInstanceInput = z.infer<typeof createInstanceSchema>;

export const addInstanceMemberSchema = z.object({
  instanceId: z.string().min(1),
  userId: z.string().min(1, "Un membre est requis."),
  fonction: z.string().optional(),
  role: z.string().optional(),
  mandat: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
});

export type AddInstanceMemberInput = z.infer<typeof addInstanceMemberSchema>;

export const updateInstanceMemberStatusSchema = z.object({
  memberId: z.string().min(1),
  statut: z.enum(["ACTIF", "TERMINE", "SUSPENDU"]),
});

export const createGovernanceMeetingSchema = z.object({
  instanceId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  dateHeure: z.string().min(1, "La date et l'heure sont requises."),
  lieu: z.string().optional(),
  ordreDuJour: z.string().optional(),
  participantIds: z.array(z.string()).default([]),
});

export type CreateGovernanceMeetingInput = z.infer<typeof createGovernanceMeetingSchema>;

export const updateGovernanceMeetingSchema = z.object({
  meetingId: z.string().min(1),
  compteRendu: z.string().optional(),
  statut: z.enum(["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"]),
});

export type UpdateGovernanceMeetingInput = z.infer<typeof updateGovernanceMeetingSchema>;

// responsableId obligatoire : comme pour MeetingDecision, chaque decision
// cree automatiquement une tache qui a toujours besoin d'un responsable.
export const addGovernanceDecisionSchema = z.object({
  meetingId: z.string().min(1),
  reference: z.string().optional(),
  objet: z.string().min(2, "L'objet est requis."),
  contexte: z.string().optional(),
  decision: z.string().min(2, "La décision prise est requise."),
  responsableId: z.string().min(1, "Un responsable est requis."),
  echeance: z.string().optional(),
  priorite: z.enum(["BASSE", "MOYENNE", "HAUTE", "CRITIQUE"]).default("MOYENNE"),
});

export type AddGovernanceDecisionInput = z.infer<typeof addGovernanceDecisionSchema>;

export const updateGovernanceDecisionStatusSchema = z.object({
  decisionId: z.string().min(1),
  statut: z.enum(["EN_COURS", "TRAITEE", "ANNULEE"]),
});

// Documents preparatoires (cahier des charges v2 §3.2C) : deposes via
// uploadthing cote client, seuls url/nom/mimeType/sizeBytes remontent ici.
export const addGovernanceMeetingDocumentSchema = z.object({
  meetingId: z.string().min(1),
  nom: z.string().min(1, "Le nom du document est requis."),
  url: z.string().min(1, "Le fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

export type AddGovernanceMeetingDocumentInput = z.infer<typeof addGovernanceMeetingDocumentSchema>;
