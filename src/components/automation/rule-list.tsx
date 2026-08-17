import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleRuleButton } from "@/components/automation/toggle-rule-button";

const TRIGGER_LABELS: Record<string, string> = {
  TASK_COMPLETED: "Une tâche est terminée",
  TASK_VALIDATION_REJECTED: "Une validation de tâche est refusée",
  DEADLINE_APPROACHING: "Une échéance approche",
  PROJECT_COMPLETED: "Le projet atteint 100 %",
  TASK_OVERDUE: "Une tâche est en retard",
  PROJECT_OVERDUE: "Le projet est en retard",
  BUDGET_EXCEEDED: "Le budget du projet est dépassé",
  RISK_CRITICAL: "Un risque critique est actif",
  TASK_CREATED: "Une tâche est créée",
  TASK_STATUS_CHANGED: "Le statut d'une tâche change",
  PROJECT_STATUS_CHANGED: "Le statut du projet change",
  OPPORTUNITY_CREATED: "Une nouvelle opportunité CRM est créée",
  RISK_CREATED: "Un nouveau risque est créé",
  DECISION_CREATED: "Une décision est prise",
  MEETING_CREATED: "Une réunion est créée",
  EVENT_CREATED: "Un événement est créé",
  INDICATOR_OFF_TARGET: "Un indicateur s'écarte de sa cible",
  CONTRACT_CREATED: "Un nouveau contrat est créé",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE_NEXT_TASK: "Créer automatiquement une tâche",
  SEND_REMINDER: "Envoyer un rappel au responsable",
  NOTIFY_STAKEHOLDERS: "Notifier les parties prenantes",
  ESCALATE_TO_MANAGER: "Escalader au manager du responsable",
  MARK_TASK_BLOCKED: "Marquer la tâche comme bloquée",
  ASSIGN_USER: "Assigner un utilisateur",
  SEND_EMAIL: "Envoyer un email (journalisé)",
  CHANGE_STATUS: "Modifier le statut",
  CREATE_MEETING: "Créer une réunion",
  CREATE_ADMIN_REQUEST: "Créer une demande",
  CREATE_RISK: "Créer un risque",
  GENERATE_REPORT: "Générer un rapport",
  REQUEST_VALIDATION: "Demander une validation",
  TRIGGER_WORKFLOW: "Déclencher une autre règle",
  VERIFY_RESOURCES: "Vérifier les ressources",
  VERIFY_RISKS: "Vérifier les risques",
  OPEN_TRACKING_BOARD: "Ouvrir le tableau de suivi",
  CREATE_DEADLINE: "Créer une échéance",
};

const CONDITION_FIELD_LABELS: Record<string, string> = {
  "task.retardJours": "retard tâche (j)",
  "task.priorite": "priorité tâche",
  "project.critique": "projet critique",
  "project.retardJours": "retard projet (j)",
  "project.budgetDepasse": "budget dépassé",
  "project.statut": "statut projet",
  "risk.probabilite": "probabilité risque",
  "risk.impact": "impact risque",
  "risk.criticite": "criticité risque",
  "opportunity.probabilite": "probabilité opportunité",
  "opportunity.montantEstime": "montant opportunité",
  "indicator.ecartPourcent": "écart indicateur (%)",
};

const OPERATOR_LABELS: Record<string, string> = {
  EQUALS: "=",
  NOT_EQUALS: "≠",
  GREATER_THAN: ">",
  LESS_THAN: "<",
  CONTAINS: "contient",
};

export type RuleData = {
  id: string;
  nom: string;
  trigger: string;
  action: string;
  isActive: boolean;
  projectId: string | null;
  nextTaskTitre: string | null;
  conditions: { champ: string; operateur: string; valeur: string; connecteur: string }[];
  executions: { id: string; resultat: string; executedAt: string }[];
};

export function RuleList({ rules, canManage }: { rules: RuleData[]; canManage: boolean }) {
  if (rules.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune règle d&apos;automatisation pour ce projet.</p>;
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <Card key={rule.id} accent={rule.isActive ? "success" : "none"}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{rule.nom}</CardTitle>
            {canManage && <ToggleRuleButton ruleId={rule.id} isActive={rule.isActive} />}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Si : {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}</Badge>
              <Badge variant="secondary">Alors : {ACTION_LABELS[rule.action] ?? rule.action}</Badge>
              {!rule.projectId && <Badge variant="outline">Globale</Badge>}
              {!rule.isActive && <Badge variant="destructive">Désactivée</Badge>}
            </div>
            {rule.conditions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Si{" "}
                {rule.conditions.map((c, i) => (
                  <span key={i}>
                    {i > 0 && ` ${rule.conditions[i - 1].connecteur} `}
                    {CONDITION_FIELD_LABELS[c.champ] ?? c.champ} {OPERATOR_LABELS[c.operateur] ?? c.operateur} {c.valeur}
                  </span>
                ))}
              </p>
            )}
            {rule.nextTaskTitre && (
              <p className="text-sm text-muted-foreground">
                Tâche créée : « {rule.nextTaskTitre} »
              </p>
            )}
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Journal d&apos;exécution ({rule.executions.length})
              </div>
              {rule.executions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Jamais déclenchée.</p>
              ) : (
                <ul className="space-y-1">
                  {rule.executions.map((exec) => (
                    <li key={exec.id} className="text-xs text-muted-foreground">
                      {new Date(exec.executedAt).toLocaleString("fr-FR")} — {exec.resultat}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
