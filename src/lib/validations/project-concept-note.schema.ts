import { z } from "zod";

// ---- Concept Note (Project Studio §5) ----

export const generateProjectConceptNoteSchema = z.object({ ideaId: z.string().min(1) });

export type GenerateProjectConceptNoteInput = z.infer<typeof generateProjectConceptNoteSchema>;

export const updateProjectConceptNoteSchema = z.object({
  conceptNoteId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  contexte: z.string().optional(),
  probleme: z.string().optional(),
  justification: z.string().optional(),
  objectifs: z.string().optional(),
  beneficiaires: z.string().optional(),
  approche: z.string().optional(),
  resultatsAttendus: z.string().optional(),
  duree: z.string().optional(),
  budgetIndicatif: z.string().optional(),
  partenaires: z.string().optional(),
  financementRecherche: z.string().optional(),
});

export type UpdateProjectConceptNoteInput = z.infer<typeof updateProjectConceptNoteSchema>;
