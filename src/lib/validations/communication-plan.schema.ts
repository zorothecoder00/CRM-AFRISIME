import { z } from "zod";

// ---- Communication Plan (Project Studio §36) ----

export const createCommunicationPlanEntrySchema = z.object({
  projectId: z.string().min(1),
  stakeholderId: z.string().min(1).optional(),
  public: z.string().min(1, "Le public visé est requis."),
  message: z.string().optional(),
  canal: z.string().optional(),
  frequence: z.string().optional(),
  responsableId: z.string().min(1).optional(),
});

export type CreateCommunicationPlanEntryInput = z.infer<typeof createCommunicationPlanEntrySchema>;

export const generateCommunicationPlanSchema = z.object({ projectId: z.string().min(1) });

export type GenerateCommunicationPlanInput = z.infer<typeof generateCommunicationPlanSchema>;

export const deleteCommunicationPlanEntrySchema = z.object({ entryId: z.string().min(1) });

export type DeleteCommunicationPlanEntryInput = z.infer<typeof deleteCommunicationPlanEntrySchema>;
