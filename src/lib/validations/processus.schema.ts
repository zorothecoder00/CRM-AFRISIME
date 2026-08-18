import { z } from "zod";

export const createProcessusSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  processusParentId: z.string().optional(),
  responsableId: z.string().optional(),
  delaiJours: z.number().int().positive().optional(),
});

export type CreateProcessusInput = z.infer<typeof createProcessusSchema>;

export const updateProcessusStatutSchema = z.object({
  processusId: z.string().min(1),
  statut: z.enum(["BROUILLON", "ACTIF", "ARCHIVE"]),
  // Motif d'archivage (V3.0 §17/§18 — mémoire organisationnelle) : conservé
  // dans OrganizationalMemoryEntry pour répondre plus tard à "pourquoi
  // avons-nous arrêté cette procédure ?". Ignoré si statut !== "ARCHIVE".
  motif: z.string().optional(),
});

// Une nouvelle version incrémente Processus.version et journalise un
// instantané (ProcessusVersion) — pas de diff structurel, juste une note.
export const createProcessusVersionSchema = z.object({
  processusId: z.string().min(1),
  note: z.string().optional(),
});

export const addEtapeSchema = z.object({
  processusId: z.string().min(1),
  nom: z.string().min(2, "Le nom de l'étape est requis."),
  responsableId: z.string().optional(),
  delaiJours: z.number().int().positive().optional(),
  entrees: z.string().optional(),
  sorties: z.string().optional(),
  regles: z.string().optional(),
});

export type AddEtapeInput = z.infer<typeof addEtapeSchema>;

export const reorderEtapesSchema = z.object({
  processusId: z.string().min(1),
  etapeIds: z.array(z.string()).min(1, "L'ordre des étapes est requis."),
});

export type ReorderEtapesInput = z.infer<typeof reorderEtapesSchema>;

export const startExecutionSchema = z.object({
  processusId: z.string().min(1),
  libelle: z.string().min(2, "Un libellé de dossier est requis."),
});

export type StartExecutionInput = z.infer<typeof startExecutionSchema>;

export const advanceExecutionSchema = z.object({
  executionId: z.string().min(1),
  etapeId: z.string().min(1, "L'étape suivante est requise."),
});

export const closeExecutionSchema = z.object({
  executionId: z.string().min(1),
  statut: z.enum(["TERMINE", "REJETE", "ANNULE"]),
});

// Documents du processus (cahier des charges v2 §4.2) : deposes via
// uploadthing cote client, seuls url/nom/mimeType/sizeBytes remontent ici.
export const addProcessusDocumentSchema = z.object({
  processusId: z.string().min(1),
  nom: z.string().min(1, "Le nom du document est requis."),
  url: z.string().min(1, "Le fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

export type AddProcessusDocumentInput = z.infer<typeof addProcessusDocumentSchema>;
