import { z } from "zod";

export const INCIDENT_TYPES = [
  "ORGANISATIONNEL",
  "INFORMATIQUE",
  "CLIENT",
  "PROJET",
  "QUALITE",
  "SECURITE",
  "OPERATIONNEL",
] as const;

export const INCIDENT_CRITICITES = ["FAIBLE", "MODERE", "IMPORTANT", "ELEVE", "CRITIQUE"] as const;
export const INCIDENT_STATUTS = ["DECLARE", "QUALIFIE", "AFFECTE", "EN_TRAITEMENT", "VALIDE", "CLOTURE"] as const;

export const createIncidentSchema = z.object({
  type: z.enum(INCIDENT_TYPES),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  criticite: z.enum(INCIDENT_CRITICITES),
  projectId: z.string().optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const updateIncidentStatutSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(INCIDENT_STATUTS),
});

export type UpdateIncidentStatutInput = z.infer<typeof updateIncidentStatutSchema>;

export const escalateIncidentSchema = z.object({
  id: z.string().min(1),
  escaladeAId: z.string().min(1, "Un destinataire est requis."),
});

export type EscalateIncidentInput = z.infer<typeof escalateIncidentSchema>;
