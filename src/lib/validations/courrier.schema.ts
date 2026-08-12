import { z } from "zod";

export const createCourrierSchema = z.object({
  objet: z.string().min(2, "L'objet est requis."),
  type: z.enum(["ENTRANT", "SORTANT", "INTERNE"]),
  confidentiel: z.boolean().optional(),
  dateCourrier: z.string().min(1, "La date est requise."),
  expediteur: z.string().optional(),
  destinataire: z.string().optional(),
  departmentId: z.string().optional(),
  responsableId: z.string().optional(),
  documentUrl: z.string().optional(),
  documentNom: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCourrierInput = z.infer<typeof createCourrierSchema>;

export const updateCourrierSchema = createCourrierSchema.extend({
  id: z.string().min(1),
});

export type UpdateCourrierInput = z.infer<typeof updateCourrierSchema>;

export const updateCourrierStatusSchema = z.object({
  courrierId: z.string().min(1),
  statut: z.enum(["A_TRAITER", "EN_COURS", "TRAITE", "ARCHIVE"]),
});

export type UpdateCourrierStatusInput = z.infer<typeof updateCourrierStatusSchema>;

export const linkCourrierTaskSchema = z.object({
  courrierId: z.string().min(1),
  taskId: z.string().optional(),
});

export type LinkCourrierTaskInput = z.infer<typeof linkCourrierTaskSchema>;
