import { z } from "zod";

export const createKnowledgeCategorySchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  parentId: z.string().optional(),
});

export type CreateKnowledgeCategoryInput = z.infer<typeof createKnowledgeCategorySchema>;

export const updateKnowledgeCategorySchema = createKnowledgeCategorySchema.extend({
  id: z.string().min(1),
});

export type UpdateKnowledgeCategoryInput = z.infer<typeof updateKnowledgeCategorySchema>;

export const createArticleSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  content: z.string().min(1, "Le contenu est requis."),
  tags: z.string().optional(),
  categoryId: z.string().optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = createArticleSchema.extend({
  id: z.string().min(1),
});

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
