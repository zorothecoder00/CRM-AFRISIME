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
