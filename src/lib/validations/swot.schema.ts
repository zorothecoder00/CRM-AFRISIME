import { z } from "zod";

export const SWOT_CATEGORIES = ["FORCE", "FAIBLESSE", "OPPORTUNITE", "MENACE"] as const;

export const createSwotItemSchema = z.object({
  categorie: z.enum(SWOT_CATEGORIES),
  contenu: z.string().min(1, "Contenu requis."),
});

export type CreateSwotItemInput = z.infer<typeof createSwotItemSchema>;
