import { z } from "zod";

export const ORGANIZATIONAL_MEMORY_TYPES = [
  "DECISION",
  "PROJET",
  "SUCCES",
  "ECHEC",
  "INCIDENT",
  "RECOMMANDATION",
  "PROCEDURE",
  "EXPERIENCE",
  "TRANSFORMATION",
] as const;

export const createMemoryEntrySchema = z.object({
  type: z.enum(ORGANIZATIONAL_MEMORY_TYPES),
  titre: z.string().min(2, "Le titre est requis."),
  contenu: z.string().min(2, "Le contenu est requis."),
});

export type CreateMemoryEntryInput = z.infer<typeof createMemoryEntrySchema>;
