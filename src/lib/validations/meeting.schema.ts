import { z } from "zod";

export const createMeetingSchema = z.object({
  projectId: z.string().min(1, "Un projet est requis."),
  titre: z.string().min(2, "Le titre est requis."),
  dateHeure: z.string().min(1, "La date et l'heure sont requises."),
  lieu: z.string().optional(),
  ordreDuJour: z.string().optional(),
  participantIds: z.array(z.string()).default([]),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateCompteRenduSchema = z.object({
  meetingId: z.string().min(1),
  compteRendu: z.string().optional(),
  statut: z.enum(["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"]),
});

export type UpdateCompteRenduInput = z.infer<typeof updateCompteRenduSchema>;

// responsableId est obligatoire : chaque decision cree automatiquement une
// tache (cahier des charges §8), qui a toujours besoin d'un responsable.
export const addDecisionSchema = z.object({
  meetingId: z.string().min(1),
  description: z.string().min(2, "La description est requise."),
  responsableId: z.string().min(1, "Un responsable est requis."),
  echeance: z.string().optional(),
});

export type AddDecisionInput = z.infer<typeof addDecisionSchema>;

export const addParticipantSchema = z.object({
  meetingId: z.string().min(1),
  userId: z.string().min(1),
});
