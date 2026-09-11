import { z } from "zod";

const CATEGORIES = [
  "RH",
  "JURIDIQUE",
  "ONG",
  "BTP",
  "CABINET_CONSEIL",
  "INCUBATEUR",
  "FORMATION",
  "GESTION_ASSOCIATIVE",
  "GESTION_PROGRAMMES",
  "GESTION_PROJETS_FINANCES",
] as const;

export const createAppCatalogEntrySchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  categorie: z.enum(CATEGORIES),
  description: z.string().optional(),
  casUsage: z.string().optional(),
});

export type CreateAppCatalogEntryInput = z.infer<typeof createAppCatalogEntrySchema>;

export const updateAppCatalogEntrySchema = createAppCatalogEntrySchema.extend({
  id: z.string().min(1),
});

export type UpdateAppCatalogEntryInput = z.infer<typeof updateAppCatalogEntrySchema>;

export const deleteAppCatalogEntrySchema = z.object({ id: z.string().min(1) });

export type DeleteAppCatalogEntryInput = z.infer<typeof deleteAppCatalogEntrySchema>;

// Revue de robustesse (2026-09-11) — updateAppCatalogStatut passait `statut`
// brut sans validation runtime, contrairement aux autres actions du fichier.
export const updateAppCatalogStatutSchema = z.enum(["PLANIFIE", "BIENTOT", "DISPONIBLE"]);
