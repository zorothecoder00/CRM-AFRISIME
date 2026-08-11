import { z } from "zod";

export const createFolderSchema = z.object({
  projectId: z.string().min(1, "Un projet est requis."),
  parentId: z.string().optional(),
  nom: z.string().min(2, "Le nom est requis."),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const createDocumentSchema = z.object({
  projectId: z.string().min(1, "Un projet est requis."),
  folderId: z.string().optional(),
  sectionId: z.string().optional(),
  taskId: z.string().optional(),
  meetingId: z.string().optional(),
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  url: z.string().min(1, "Un lien ou chemin de fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const addDocumentVersionSchema = z.object({
  documentId: z.string().min(1),
  url: z.string().min(1, "Un lien ou chemin de fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  note: z.string().optional(),
});

export type AddDocumentVersionInput = z.infer<typeof addDocumentVersionSchema>;
