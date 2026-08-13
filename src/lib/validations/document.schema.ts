import { z } from "zod";

export const createFolderSchema = z.object({
  projectId: z.string().min(1, "Un projet est requis."),
  parentId: z.string().optional(),
  nom: z.string().min(2, "Le nom est requis."),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const documentTypeSchema = z.enum([
  "CONTRAT",
  "RAPPORT",
  "FACTURE",
  "PROCES_VERBAL",
  "LIVRABLE",
  "AUTRE",
]);

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
  type: documentTypeSchema.default("AUTRE"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSignatureSchema = z.object({
  documentId: z.string().min(1),
  statutSignature: z.enum(["NON_REQUISE", "EN_ATTENTE", "SIGNE", "REFUSE"]),
  dateSignature: z.string().optional(),
});

export type UpdateDocumentSignatureInput = z.infer<typeof updateDocumentSignatureSchema>;

// Depot depuis le portail externe (cahier des charges §21) : pas de projectId
// choisi par le contact, il est derive de la mission (Task) ciblee.
export const depositPortalDocumentSchema = z.object({
  taskId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  url: z.string().min(1, "Un fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

export type DepositPortalDocumentInput = z.infer<typeof depositPortalDocumentSchema>;

export const reviewPortalDeliverableSchema = z.object({
  documentId: z.string().min(1),
  decision: z.enum(["VALIDE", "REJETE"]),
  commentaire: z.string().optional(),
});

export type ReviewPortalDeliverableInput = z.infer<typeof reviewPortalDeliverableSchema>;

export const addDocumentVersionSchema = z.object({
  documentId: z.string().min(1),
  url: z.string().min(1, "Un lien ou chemin de fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  note: z.string().optional(),
});

export type AddDocumentVersionInput = z.infer<typeof addDocumentVersionSchema>;
