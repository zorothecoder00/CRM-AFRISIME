import { z } from "zod";

// La criticité n'est jamais saisie ici : elle est calculée côté serveur à
// partir de probabilité x impact (src/lib/risk-matrix.ts).
export const createOrganizationalRiskSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  categorie: z.string().optional(),
  origine: z.string().optional(),
  probabilite: z.enum(["FAIBLE", "MOYENNE", "ELEVEE"]).default("MOYENNE"),
  impact: z.enum(["FAIBLE", "MOYEN", "ELEVE"]).default("MOYEN"),
  responsableId: z.string().optional(),
  projectId: z.string().optional(),
  processusId: z.string().optional(),
  mesuresPreventives: z.string().optional(),
  planMitigation: z.string().optional(),
  echeance: z.string().optional(),
});

export type CreateOrganizationalRiskInput = z.infer<typeof createOrganizationalRiskSchema>;

export const updateOrganizationalRiskSchema = createOrganizationalRiskSchema.extend({
  riskId: z.string().min(1),
  statut: z.enum(["IDENTIFIE", "EN_TRAITEMENT", "MAITRISE", "SURVENU", "CLOS"]),
});

export type UpdateOrganizationalRiskInput = z.infer<typeof updateOrganizationalRiskSchema>;
