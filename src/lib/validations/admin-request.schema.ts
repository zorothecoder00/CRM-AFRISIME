import { z } from "zod";

export const createAdminRequestSchema = z.object({
  type: z.enum(["ACHAT", "MISSION", "DECAISSEMENT", "MATERIEL", "AUTORISATION", "RECRUTEMENT", "AUTRE"]),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  montant: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  departmentId: z.string().optional(),
});

export type CreateAdminRequestInput = z.infer<typeof createAdminRequestSchema>;
