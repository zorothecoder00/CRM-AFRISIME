import { z } from "zod";

// Types d'entites pourvues d'un selecteur de tags dans l'UI (V2.2 §28) —
// meme logique ouverte que DEPENDENCY_ENTITY_TYPES : EntityTag reste
// generique (entityType en String), d'autres types pourront s'ajouter sans
// migration.
export const TAGGABLE_ENTITY_TYPES = [
  "Project",
  "Task",
  "Document",
  "Contract",
  "ProjectRisk",
  "OrganizationalRisk",
  "MeetingDecision",
  "GovernanceDecision",
  "CrmOrganization",
  "Processus",
  "Meeting",
] as const;

export const setEntityTagsSchema = z.object({
  entityType: z.enum(TAGGABLE_ENTITY_TYPES),
  entityId: z.string().min(1),
  tagNames: z.array(z.string().trim().min(1).max(40)).max(20),
});

export type SetEntityTagsInput = z.infer<typeof setEntityTagsSchema>;
