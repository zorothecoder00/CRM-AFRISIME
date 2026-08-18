import { z } from "zod";

// Sélecteurs UI limités aux types déjà pourvus d'une page de sélection dans
// l'app (V2.2 §13) — le modèle Dependency reste ouvert à d'autres types
// plus tard sans migration. MeetingDecision/GovernanceDecision (décisions),
// ProjectResource (ressources) et CrmOrganization de type PARTENAIRE
// (partenaires) ajoutés pour combler les trous identifiés à l'audit.
// CrmContact ajouté pour le Graphe organisationnel (V3.0 §5) — les
// prestataires (CrmContact.type=PRESTATAIRE) n'ont pas de FK native vers
// Team/Project, la chaîne Équipe->Prestataire->Projet passe par Dependency.
// Transformation ajouté pour le Change Impact Analysis (V3.0 §20) — relier
// une transformation aux processus/projets qu'elle affecte.
export const DEPENDENCY_ENTITY_TYPES = [
  "Project",
  "Team",
  "User",
  "Processus",
  "MeetingDecision",
  "GovernanceDecision",
  "ProjectResource",
  "CrmOrganization",
  "CrmContact",
  "Transformation",
] as const;

export const createDependencySchema = z
  .object({
    sourceType: z.enum(DEPENDENCY_ENTITY_TYPES),
    sourceId: z.string().min(1, "Entité source requise."),
    targetType: z.enum(DEPENDENCY_ENTITY_TYPES),
    targetId: z.string().min(1, "Entité cible requise."),
    type: z.enum(["BLOQUE", "LIE_A"]).default("BLOQUE"),
    notes: z.string().optional(),
  })
  .refine((d) => !(d.sourceType === d.targetType && d.sourceId === d.targetId), {
    message: "Une entité ne peut pas dépendre d'elle-même.",
    path: ["targetId"],
  });

export type CreateDependencyInput = z.infer<typeof createDependencySchema>;
