import Link from "next/link";
import type { TaskRow } from "@/components/tasks/task-list-view";

export type GanttTaskRow = TaskRow & { dateDebut: string | null };
export type GanttDependency = { taskId: string; dependsOnTaskId: string; type: string };

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
const ROW_HEIGHT_REM = 1.75;
const LABEL_COL_REM = 12.5; // 200px label column + gap, in rem (~1fr layout below matches)

/**
 * Vue Gantt (cahier des charges §7, dépendances Project Studio §18) : barres
 * positionnées entre début et échéance, flèches de dépendance superposées en
 * SVG. Les coordonnées X des flèches sont en pourcentage de la largeur de la
 * colonne barres (identique sur toutes les lignes, même grille), donc un seul
 * SVG en `preserveAspectRatio="none"` suffit à couvrir toutes les lignes sans
 * mesurer le DOM — condition : chaque ligne a la même hauteur fixe
 * (ROW_HEIGHT_REM), pas une hauteur dépendant du contenu.
 */
export function TaskGanttView({ tasks, dependencies = [] }: { tasks: GanttTaskRow[]; dependencies?: GanttDependency[] }) {
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

  const bars = withDates.map((task) => {
    const start = new Date(task.dateDebut ?? task.echeance!).getTime();
    const end = Math.max(new Date(task.echeance ?? task.dateDebut!).getTime(), start + DAY_MS);
    return {
      task,
      left: ((start - rangeStart) / rangeSpan) * 100,
      width: Math.max(((end - start) / rangeSpan) * 100, 0.8),
    };
  });
  const indexById = new Map(bars.map((b, i) => [b.task.id, i]));

  const arrows = dependencies
    .map((dep) => {
      const fromIndex = indexById.get(dep.dependsOnTaskId);
      const toIndex = indexById.get(dep.taskId);
      if (fromIndex === undefined || toIndex === undefined) return null;
      const from = bars[fromIndex]!;
      const to = bars[toIndex]!;
      const x1 = dep.type === "START_TO_START" || dep.type === "START_TO_FINISH" ? from.left : from.left + from.width;
      const x2 = dep.type === "FINISH_TO_FINISH" || dep.type === "START_TO_FINISH" ? to.left + to.width : to.left;
      return { x1, y1: fromIndex + 0.5, x2, y2: toIndex + 0.5, key: `${dep.dependsOnTaskId}-${dep.taskId}` };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="relative min-w-[640px]" style={{ height: `${bars.length * ROW_HEIGHT_REM}rem` }}>
          {arrows.length > 0 && (
            <svg
              className="pointer-events-none absolute top-0"
              style={{ left: `${LABEL_COL_REM}rem`, right: 0, height: "100%", width: `calc(100% - ${LABEL_COL_REM}rem)` }}
              viewBox={`0 0 100 ${bars.length}`}
              preserveAspectRatio="none"
            >
              {arrows.map((a) => (
                <line
                  key={a.key}
                  x1={a.x1}
                  y1={a.y1}
                  x2={a.x2}
                  y2={a.y2}
                  stroke="#8994a0"
                  strokeWidth={0.3}
                  strokeDasharray="1.5,1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
          {bars.map(({ task, left, width }, i) => {
            const color = STATUS_COLOR[task.statut] ?? STATUS_COLOR.A_FAIRE;
            return (
              <Link
                key={task.id}
                href={`/taches/${task.id}`}
                className="grid grid-cols-[200px_1fr] items-center gap-2 rounded-md text-sm hover:bg-muted"
                style={{ position: "absolute", top: `${i * ROW_HEIGHT_REM}rem`, left: 0, right: 0, height: `${ROW_HEIGHT_REM}rem` }}
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

      {dependencies.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Pointillés : dépendances entre tâches (FS/SS/FF/SF — voir l&apos;onglet Dépendances de chaque tâche).
        </p>
      )}
      {withoutDates.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {withoutDates.length} tâche(s) sans date de début ni échéance, non représentées ci-dessus.
        </p>
      )}
    </div>
  );
}
