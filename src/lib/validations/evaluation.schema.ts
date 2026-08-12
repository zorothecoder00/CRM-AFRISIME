import { z } from "zod";

export const createEvaluationSchema = z.object({
  evalueId: z.string().min(1, "Un collaborateur évalué est requis."),
  periode: z.enum(["ANNUELLE", "SEMESTRIELLE", "TRIMESTRIELLE"]),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
  pointsForts: z.string().optional(),
  axesAmelioration: z.string().optional(),
  commentaireEvaluateur: z.string().optional(),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

export const updateEvaluationSchema = createEvaluationSchema
  .omit({ evalueId: true, periode: true })
  .extend({
    id: z.string().min(1),
  });

export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;

export const addEvaluationCritereSchema = z.object({
  evaluationId: z.string().min(1),
  libelle: z.string().min(2, "Le libellé est requis."),
  note: z.string().min(1, "Une note est requise."),
  commentaire: z.string().optional(),
});

export type AddEvaluationCritereInput = z.infer<typeof addEvaluationCritereSchema>;

export const updateEvaluationCritereSchema = z.object({
  critereId: z.string().min(1),
  note: z.string().min(1, "Une note est requise."),
  commentaire: z.string().optional(),
});

export type UpdateEvaluationCritereInput = z.infer<typeof updateEvaluationCritereSchema>;

export const acknowledgeEvaluationSchema = z.object({
  evaluationId: z.string().min(1),
  commentaireEvalue: z.string().optional(),
});

export type AcknowledgeEvaluationInput = z.infer<typeof acknowledgeEvaluationSchema>;
