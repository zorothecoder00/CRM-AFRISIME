import { z } from "zod";

// Formulaires de collecte (cahier des charges Project Studio §48).

export const createDataFormSchema = z.object({
  projectId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
});

export type CreateDataFormInput = z.infer<typeof createDataFormSchema>;

export const updateDataFormActifSchema = z.object({
  formId: z.string().min(1),
  actif: z.boolean(),
});

export type UpdateDataFormActifInput = z.infer<typeof updateDataFormActifSchema>;

export const deleteDataFormSchema = z.object({ formId: z.string().min(1) });

export type DeleteDataFormInput = z.infer<typeof deleteDataFormSchema>;

export const addDataFormFieldSchema = z.object({
  formId: z.string().min(1),
  label: z.string().min(2, "Le libellé est requis."),
  type: z.enum(["TEXTE", "NOMBRE", "DATE", "CHOIX_UNIQUE", "OUI_NON"]),
  options: z.string().optional(),
  requis: z.boolean().optional().default(false),
  indicatorId: z.string().optional(),
});

export type AddDataFormFieldInput = z.infer<typeof addDataFormFieldSchema>;

export const deleteDataFormFieldSchema = z.object({ fieldId: z.string().min(1) });

export type DeleteDataFormFieldInput = z.infer<typeof deleteDataFormFieldSchema>;

export const submitDataFormSchema = z.object({
  formId: z.string().min(1),
  data: z.record(z.string(), z.string()),
});

export type SubmitDataFormInput = z.infer<typeof submitDataFormSchema>;

export const deleteDataFormSubmissionSchema = z.object({ submissionId: z.string().min(1) });

export type DeleteDataFormSubmissionInput = z.infer<typeof deleteDataFormSubmissionSchema>;
