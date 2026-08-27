import { z } from "zod";

// ---- Planning personnel (notes/creneaux prives, distincts de Leave/Event) ----

export const createPersonalPlanningEntrySchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  notes: z.string().optional(),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
  type: z.enum(["NOTE", "INDISPONIBLE"]).optional().default("NOTE"),
});

export type CreatePersonalPlanningEntryInput = z.infer<typeof createPersonalPlanningEntrySchema>;

export const updatePersonalPlanningEntrySchema = z.object({
  id: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  notes: z.string().optional(),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
  type: z.enum(["NOTE", "INDISPONIBLE"]),
});

export type UpdatePersonalPlanningEntryInput = z.infer<typeof updatePersonalPlanningEntrySchema>;

export const deletePersonalPlanningEntrySchema = z.object({ id: z.string().min(1) });

export type DeletePersonalPlanningEntryInput = z.infer<typeof deletePersonalPlanningEntrySchema>;

export const getAvailabilitySchema = z.object({
  userId: z.string().min(1),
  dateDebut: z.string().min(1),
  dateFin: z.string().min(1),
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;

// ---- Demande de creneau (AvailabilityRequest) ----

export const createAvailabilityRequestSchema = z.object({
  targetUserId: z.string().min(1, "Un destinataire est requis."),
  titre: z.string().min(2, "Le titre est requis."),
  message: z.string().optional(),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
});

export type CreateAvailabilityRequestInput = z.infer<typeof createAvailabilityRequestSchema>;

export const decideAvailabilityRequestSchema = z.object({
  requestId: z.string().min(1),
  statut: z.enum(["ACCEPTEE", "REFUSEE"]),
  motifRefus: z.string().optional(),
});

export type DecideAvailabilityRequestInput = z.infer<typeof decideAvailabilityRequestSchema>;

export const cancelAvailabilityRequestSchema = z.object({ requestId: z.string().min(1) });

export type CancelAvailabilityRequestInput = z.infer<typeof cancelAvailabilityRequestSchema>;
