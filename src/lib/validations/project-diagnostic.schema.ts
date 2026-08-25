import { z } from "zod";

// ---- Diagnostic du projet (Project Studio §6) ----

export const saveProjectDiagnosticSchema = z.object({
  projectId: z.string().min(1),
  analyseContexte: z.string().optional(),
  analyseBesoins: z.string().optional(),
  analyseCauses: z.string().optional(),
  analyseConsequences: z.string().optional(),
  donneesStatistiques: z.string().optional(),
  enquetes: z.string().optional(),
  consultations: z.string().optional(),
  etudesExistantes: z.string().optional(),
  analyseDocumentaire: z.string().optional(),
});

export type SaveProjectDiagnosticInput = z.infer<typeof saveProjectDiagnosticSchema>;
