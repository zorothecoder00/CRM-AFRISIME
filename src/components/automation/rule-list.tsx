import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleRuleButton } from "@/components/automation/toggle-rule-button";

const TRIGGER_LABELS: Record<string, string> = {
  TASK_COMPLETED: "Une tâche est terminée",
  TASK_VALIDATION_REJECTED: "Une validation de tâche est refusée",
  DEADLINE_APPROACHING: "Une échéance approche",
  PROJECT_COMPLETED: "Le projet atteint 100 %",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE_NEXT_TASK: "Créer automatiquement une tâche",
  SEND_REMINDER: "Envoyer un rappel au responsable",
  NOTIFY_STAKEHOLDERS: "Notifier les parties prenantes",
};

export type RuleData = {
  id: string;
  nom: string;
  trigger: string;
  action: string;
  isActive: boolean;
  nextTaskTitre: string | null;
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
              <Badge variant="outline">Si : {TRIGGER_LABELS[rule.trigger]}</Badge>
              <Badge variant="secondary">Alors : {ACTION_LABELS[rule.action]}</Badge>
              {!rule.isActive && <Badge variant="destructive">Désactivée</Badge>}
            </div>
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
