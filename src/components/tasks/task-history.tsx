const ACTION_LABELS: Record<string, string> = {
  "task.created": "Tâche créée",
  "task.status_changed": "Statut modifié",
  "task.comment_added": "Commentaire ajouté",
  "task.checklist_item_added": "Élément de checklist ajouté",
  "task.checklist_item_toggled": "Élément de checklist coché/décoché",
  "task.dependency_added": "Dépendance ajoutée",
  "task.actual_time_updated": "Temps réel mis à jour",
  "task.validation_submitted": "Soumise pour validation",
  "task.validation_step_approved": "Étape de validation approuvée",
  "task.validation_step_rejected": "Étape de validation refusée",
  "task.created_from_meeting_decision": "Créée depuis une décision de réunion",
};

export type TaskHistoryEntry = {
  id: string;
  action: string;
  authorName: string | null;
  createdAt: string;
  changes: unknown;
};

function formatChanges(changes: unknown): string | null {
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ");
}

/** Historique des modifications d'une tâche (cahier des charges §6), depuis le journal d'audit. */
export function TaskHistory({ entries }: { entries: TaskHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun historique.</p>;
  }

  return (
    <ol className="space-y-2">
      {entries.map((entry) => {
        const detail = formatChanges(entry.changes);
        return (
          <li key={entry.id} className="border-l-2 pl-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
              <span className="text-xs text-muted-foreground">
                {entry.authorName ?? "Système"} · {new Date(entry.createdAt).toLocaleString("fr-FR")}
              </span>
            </div>
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}
