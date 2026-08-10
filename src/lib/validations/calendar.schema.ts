import { z } from "zod";

export const createLeaveSchema = z.object({
  type: z.enum(["CONGE_PAYE", "MALADIE", "AUTRE"]),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
  motif: z.string().optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

export const decideLeaveSchema = z.object({
  leaveId: z.string().min(1),
  statut: z.enum(["APPROUVE", "REFUSE"]),
});

export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;

export const createEventSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().optional(),
  projectId: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
