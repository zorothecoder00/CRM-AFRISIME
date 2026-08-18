import { z } from "zod";

export const TRIGGER_VALUES = [
  "TASK_COMPLETED",
  "TASK_VALIDATION_REJECTED",
  "DEADLINE_APPROACHING",
  "PROJECT_COMPLETED",
  "TASK_OVERDUE",
  "PROJECT_OVERDUE",
  "BUDGET_EXCEEDED",
  "RISK_CRITICAL",
  "TASK_CREATED",
  "TASK_STATUS_CHANGED",
  "PROJECT_STATUS_CHANGED",
  "OPPORTUNITY_CREATED",
  "RISK_CREATED",
  "DECISION_CREATED",
  "MEETING_CREATED",
  "EVENT_CREATED",
  "INDICATOR_OFF_TARGET",
  "CONTRACT_CREATED",
  "INTEGRATION_EVENT_RECEIVED",
] as const;

export const ACTION_VALUES = [
  "CREATE_NEXT_TASK",
  "SEND_REMINDER",
  "NOTIFY_STAKEHOLDERS",
  "ESCALATE_TO_MANAGER",
  "MARK_TASK_BLOCKED",
  "ASSIGN_USER",
  "SEND_EMAIL",
  "CHANGE_STATUS",
  "CREATE_MEETING",
  "CREATE_ADMIN_REQUEST",
  "CREATE_RISK",
  "GENERATE_REPORT",
  "REQUEST_VALIDATION",
  "TRIGGER_WORKFLOW",
  "VERIFY_RESOURCES",
  "VERIFY_RISKS",
  "OPEN_TRACKING_BOARD",
  "CREATE_DEADLINE",
  "ORCHESTRATE_NOUVEAU_CONTRAT",
] as const;

const conditionSchema = z.object({
  champ: z.string().min(1, "Champ requis."),
  operateur: z.enum(["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS"]),
  valeur: z.string().min(1, "Valeur requise."),
  connecteur: z.enum(["ET", "OU"]).default("ET"),
});

export const createRuleSchema = z
  .object({
    // Optionnel depuis V2.2 §7 : une règle sans projectId est globale.
    projectId: z.string().optional(),
    nom: z.string().min(2, "Le nom est requis."),
    trigger: z.enum(TRIGGER_VALUES),
    action: z.enum(ACTION_VALUES),
    // Gouvernance IA (V2.2 §42) — defaut au comportement historique.
    niveauIA: z.enum(["SUGGESTION", "VALIDATION", "AUTOMATISATION"]).default("AUTOMATISATION"),

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
    deadlineTitre: z.string().optional(),
    deadlineDelaiJours: z.string().optional(),
    orchestrationDepartmentId: z.string().optional(),
    orchestrationResponsableId: z.string().optional(),

    // Branche ELSE (V2.2 §7.2) — regle a executer si les conditions echouent.
    elseRuleId: z.string().optional(),

    // Regroupement d'orchestration (V2.2 §8) — une règle avec playbookId est
    // une étape ordonnée, pas une règle indépendante.
    playbookId: z.string().optional(),
    ordre: z.string().optional(),

    // Conditions (V2.2 §7.2) — vide = aucune condition, la règle s'exécute
    // toujours pour ce déclencheur.
    conditions: z.array(conditionSchema).default([]),
  })
  .refine((data) => data.action !== "CREATE_NEXT_TASK" || !!data.nextTaskTitre, {
    message: "Le titre de la tâche suivante est requis pour cette action.",
    path: ["nextTaskTitre"],
  })
  .refine((data) => data.action !== "CREATE_NEXT_TASK" || !!data.nextTaskResponsableId, {
    message: "Un responsable est requis pour cette action.",
    path: ["nextTaskResponsableId"],
  })
  .refine((data) => data.action !== "ASSIGN_USER" || !!data.assignUserId, {
    message: "Un utilisateur est requis pour cette action.",
    path: ["assignUserId"],
  })
  .refine((data) => data.action !== "CHANGE_STATUS" || !!data.changeStatusValue, {
    message: "Un statut cible est requis pour cette action.",
    path: ["changeStatusValue"],
  })
  .refine((data) => data.action !== "CREATE_ADMIN_REQUEST" || !!data.adminRequestType, {
    message: "Un type de demande est requis pour cette action.",
    path: ["adminRequestType"],
  })
  .refine((data) => data.action !== "GENERATE_REPORT" || !!data.reportType, {
    message: "Un type de rapport est requis pour cette action.",
    path: ["reportType"],
  })
  .refine((data) => data.action !== "TRIGGER_WORKFLOW" || !!data.targetRuleId, {
    message: "Une règle cible est requise pour cette action.",
    path: ["targetRuleId"],
  })
  .refine((data) => data.action !== "ORCHESTRATE_NOUVEAU_CONTRAT" || !!data.orchestrationDepartmentId, {
    message: "Un département est requis pour cette action.",
    path: ["orchestrationDepartmentId"],
  })
  .refine((data) => data.action !== "ORCHESTRATE_NOUVEAU_CONTRAT" || !!data.orchestrationResponsableId, {
    message: "Un responsable est requis pour cette action.",
    path: ["orchestrationResponsableId"],
  });

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
