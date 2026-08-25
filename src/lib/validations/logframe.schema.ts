import { z } from "zod";

// ---- Logframe Builder (Project Studio §12) ----

export const generateLogframeSchema = z.object({ projectId: z.string().min(1) });

export type GenerateLogframeInput = z.infer<typeof generateLogframeSchema>;

const logframeLevelEnum = z.enum(["IMPACT", "OUTCOME", "OUTPUT", "ACTIVITES"]);

export const createLogframeRowSchema = z.object({
  projectId: z.string().min(1),
  niveau: logframeLevelEnum,
  resultats: z.string().optional(),
  indicateurs: z.string().optional(),
  sources: z.string().optional(),
  hypotheses: z.string().optional(),
});

export type CreateLogframeRowInput = z.infer<typeof createLogframeRowSchema>;

export const updateLogframeRowSchema = z.object({
  rowId: z.string().min(1),
  resultats: z.string().optional(),
  indicateurs: z.string().optional(),
  sources: z.string().optional(),
  hypotheses: z.string().optional(),
});

export type UpdateLogframeRowInput = z.infer<typeof updateLogframeRowSchema>;

export const deleteLogframeRowSchema = z.object({ rowId: z.string().min(1) });

export type DeleteLogframeRowInput = z.infer<typeof deleteLogframeRowSchema>;
