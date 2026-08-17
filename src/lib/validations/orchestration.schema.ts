import { z } from "zod";
import { TRIGGER_VALUES, ACTION_VALUES } from "@/lib/validations/automation.schema";

const conditionSchema = z.object({
  champ: z.string().min(1, "Champ requis."),
  operateur: z.enum(["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS"]),
  valeur: z.string().min(1, "Valeur requise."),
  connecteur: z.enum(["ET", "OU"]).default("ET"),
});

// Meme jeu de champs de config que CreateRuleInput (automation.schema.ts) :
// une etape de playbook EST une AutomationRule, seule sa creation groupee
// diffère (V2.2 §8).
const playbookStepSchema = z.object({
  nom: z.string().min(1, "Le nom de l'étape est requis."),
  action: z.enum(ACTION_VALUES),
  nextTaskTitre: z.string().optional(),
  nextTaskResponsableId: z.string().optional(),
  nextTaskDelaiJours: z.string().optional(),
  reminderDelaiJours: z.string().optional(),
  assignUserId: z.string().optional(),
  changeStatusValue: z.string().optional(),
  meetingTitre: z.string().optional(),
  meetingDelaiJours: z.string().optional(),
  adminRequestType: z
    .enum(["ACHAT", "MISSION", "DECAISSEMENT", "MATERIEL", "AUTORISATION", "RECRUTEMENT", "AUTRE"])
    .optional(),
  adminRequestTitre: z.string().optional(),
  riskTitre: z.string().optional(),
  riskProbabilite: z.enum(["FAIBLE", "MOYENNE", "ELEVEE"]).optional(),
  riskImpact: z.enum(["FAIBLE", "MOYEN", "ELEVE"]).optional(),
  reportType: z.string().optional(),
  targetRuleId: z.string().optional(),
  conditions: z.array(conditionSchema).default([]),
});

export const createPlaybookSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  trigger: z.enum(TRIGGER_VALUES),
  // Omis = playbook global (V2.2 §7/§8), non lié à un projet.
  projectId: z.string().optional(),
  steps: z.array(playbookStepSchema).min(1, "Au moins une étape est requise."),
});

export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;
export type PlaybookStepInput = z.infer<typeof playbookStepSchema>;
