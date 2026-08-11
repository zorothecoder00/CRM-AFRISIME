import Link from "next/link";
import type { TaskRow } from "@/components/tasks/task-list-view";

export type GanttTaskRow = TaskRow & { dateDebut: string | null };

// Couleurs de statut fixes (palette validee CVD-safe, cf. StatCard/KpiCard) —
// jamais recyclees comme couleur categorielle, toujours associees a un
// libellé de statut deja affiche par ailleurs sur la ligne.
const STATUS_COLOR: Record<string, string> = {
  TERMINEE: "#0ca30c",
  EN_COURS: "#2a78d6",
  EN_REVISION: "#fab219",
  BLOQUEE: "#d03b3b",
  A_FAIRE: "#8994a0",
  ANNULEE: "#8994a0",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Vue Gantt (cahier des charges §7) : barres positionnées entre début et échéance. */
export function TaskGanttView({ tasks }: { tasks: GanttTaskRow[] }) {
  const withDates = tasks.filter((t) => t.dateDebut || t.echeance);
  const withoutDates = tasks.filter((t) => !t.dateDebut && !t.echeance);

  if (withDates.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune tâche avec une date pour construire le Gantt.</p>;
  }

  const starts = withDates.map((t) => new Date(t.dateDebut ?? t.echeance!).getTime());
  const ends = withDates.map((t) => new Date(t.echeance ?? t.dateDebut!).getTime());
  const rangeStart = Math.min(...starts) - DAY_MS;
  const rangeEnd = Math.max(...ends) + DAY_MS;
  const rangeSpan = Math.max(rangeEnd - rangeStart, DAY_MS);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[640px] space-y-1.5">
          {withDates.map((task) => {
            const start = new Date(task.dateDebut ?? task.echeance!).getTime();
            const end = Math.max(new Date(task.echeance ?? task.dateDebut!).getTime(), start + DAY_MS);
            const left = ((start - rangeStart) / rangeSpan) * 100;
            const width = Math.max(((end - start) / rangeSpan) * 100, 0.8);
            const color = STATUS_COLOR[task.statut] ?? STATUS_COLOR.A_FAIRE;

            return (
              <Link
                key={task.id}
                href={`/taches/${task.id}`}
                className="grid grid-cols-[200px_1fr] items-center gap-2 rounded-md py-1 text-sm hover:bg-muted"
                title={`${task.titre} — ${task.avancement}%`}
              >
                <span className="truncate">{task.titre}</span>
                <div className="relative h-5 rounded bg-muted/60">
                  <div
                    className="absolute top-0.5 h-4 rounded-full"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: `${color}33`,
                      border: `1px solid ${color}`,
                    }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${task.avancement}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {withoutDates.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {withoutDates.length} tâche(s) sans date de début ni échéance, non représentées ci-dessus.
        </p>
      )}
    </div>
  );
}
