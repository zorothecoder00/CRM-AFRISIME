import { z } from "zod";

// ---- Problem Tree (Project Studio §7) ----

const problemTreeNodeTypeEnum = z.enum(["CONSEQUENCE", "PROBLEME_CENTRAL", "CAUSE_DIRECTE", "CAUSE_PROFONDE"]);

export const createProblemTreeNodeSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().optional(),
  type: problemTreeNodeTypeEnum,
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  sources: z.string().optional(),
});

export type CreateProblemTreeNodeInput = z.infer<typeof createProblemTreeNodeSchema>;

export const updateProblemTreeNodeSchema = z.object({
  nodeId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  sources: z.string().optional(),
});

export type UpdateProblemTreeNodeInput = z.infer<typeof updateProblemTreeNodeSchema>;

export const deleteProblemTreeNodeSchema = z.object({ nodeId: z.string().min(1) });

export type DeleteProblemTreeNodeInput = z.infer<typeof deleteProblemTreeNodeSchema>;

export const reorderProblemTreeNodesSchema = z.object({
  projectId: z.string().min(1),
  nodeIds: z.array(z.string().min(1)),
});

export type ReorderProblemTreeNodesInput = z.infer<typeof reorderProblemTreeNodesSchema>;

// ---- Liens (Project Studio §7 — données/documents/indicateurs/commentaires) ----

export const linkProblemTreeNodeDocumentSchema = z.object({
  nodeId: z.string().min(1),
  documentId: z.string().min(1),
});

export type LinkProblemTreeNodeDocumentInput = z.infer<typeof linkProblemTreeNodeDocumentSchema>;

export const unlinkProblemTreeNodeDocumentSchema = z.object({ linkId: z.string().min(1) });

export type UnlinkProblemTreeNodeDocumentInput = z.infer<typeof unlinkProblemTreeNodeDocumentSchema>;

export const linkProblemTreeNodeIndicatorSchema = z.object({
  nodeId: z.string().min(1),
  indicatorId: z.string().min(1),
});

export type LinkProblemTreeNodeIndicatorInput = z.infer<typeof linkProblemTreeNodeIndicatorSchema>;

export const unlinkProblemTreeNodeIndicatorSchema = z.object({ linkId: z.string().min(1) });

export type UnlinkProblemTreeNodeIndicatorInput = z.infer<typeof unlinkProblemTreeNodeIndicatorSchema>;

export const addProblemTreeNodeCommentSchema = z.object({
  nodeId: z.string().min(1),
  content: z.string().min(1, "Le commentaire ne peut pas être vide."),
});

export type AddProblemTreeNodeCommentInput = z.infer<typeof addProblemTreeNodeCommentSchema>;

export const deleteProblemTreeNodeCommentSchema = z.object({ commentId: z.string().min(1) });

export type DeleteProblemTreeNodeCommentInput = z.infer<typeof deleteProblemTreeNodeCommentSchema>;
