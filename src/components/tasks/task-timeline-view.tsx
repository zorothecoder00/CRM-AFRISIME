import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toneForTaskStatus } from "@/lib/status-tone";
import type { TaskRow } from "@/components/tasks/task-list-view";

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
};

function groupByDate(tasks: TaskRow[]) {
  const groups = new Map<string, TaskRow[]>();
  const sorted = [...tasks].sort((a, b) => {
    if (!a.echeance) return 1;
    if (!b.echeance) return -1;
    return a.echeance.localeCompare(b.echeance);
  });
  for (const task of sorted) {
    const key = task.echeance ? task.echeance.slice(0, 10) : "sans-echeance";
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  return groups;
}

/** Vue Chronologie (cahier des charges §7) : tâches groupées par échéance. */
export function TaskTimelineView({ tasks }: { tasks: TaskRow[] }) {
  const groups = groupByDate(tasks);

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune tâche.</p>;
  }

  return (
    <ol className="space-y-6">
      {Array.from(groups.entries()).map(([dateKey, group]) => (
        <li key={dateKey} className="relative border-l-2 pl-4">
          <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
          <div className="mb-2 text-sm font-semibold">
            {dateKey === "sans-echeance"
              ? "Sans échéance"
              : new Date(dateKey).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
          </div>
          <ul className="space-y-1.5">
            {group.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/taches/${task.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{task.titre}</span>
                  <span className="text-xs text-muted-foreground">{task.projectNom}</span>
                  <Badge variant={toneForTaskStatus(task.statut)} className="ml-auto">
                    {STATUS_LABELS[task.statut] ?? task.statut}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
