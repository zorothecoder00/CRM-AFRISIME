import { z } from "zod";

// ---- Solution Tree (Project Studio §8) ----

export const generateSolutionTreeSchema = z.object({ projectId: z.string().min(1) });

export type GenerateSolutionTreeInput = z.infer<typeof generateSolutionTreeSchema>;

const solutionTreeNodeTypeEnum = z.enum(["OBJECTIF_GLOBAL", "SOLUTION", "RESULTAT_ATTENDU"]);

export const createSolutionTreeNodeSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().optional(),
  type: solutionTreeNodeTypeEnum,
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
});

export type CreateSolutionTreeNodeInput = z.infer<typeof createSolutionTreeNodeSchema>;

export const updateSolutionTreeNodeSchema = z.object({
  nodeId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
});

export type UpdateSolutionTreeNodeInput = z.infer<typeof updateSolutionTreeNodeSchema>;

export const deleteSolutionTreeNodeSchema = z.object({ nodeId: z.string().min(1) });

export type DeleteSolutionTreeNodeInput = z.infer<typeof deleteSolutionTreeNodeSchema>;

export const reorderSolutionTreeNodesSchema = z.object({
  projectId: z.string().min(1),
  nodeIds: z.array(z.string().min(1)),
});

export type ReorderSolutionTreeNodesInput = z.infer<typeof reorderSolutionTreeNodesSchema>;
