const ACTION_LABELS: Record<string, string> = {
  "personal_planning_entry.updated": "Entrée modifiée",
  "personal_planning_entry.moved": "Entrée déplacée",
  "personal_planning_entry.promoted_to_task": "Transformée en tâche de projet",
};

export type PersonalPlanningHistoryEntry = {
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
  return entries
    .map(([k, v]) => {
      if (v && typeof v === "object" && "avant" in v && "apres" in v) {
        const { avant, apres } = v as { avant: unknown; apres: unknown };
        return `${k} : ${String(avant)} → ${String(apres)}`;
      }
      return `${k}: ${String(v)}`;
    })
    .join(", ");
}

/** §47 — historique des modifications d'une entrée de planning personnel, depuis le journal d'audit. */
export function PersonalPlanningHistory({ entries }: { entries: PersonalPlanningHistoryEntry[] }) {
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
