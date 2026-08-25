import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CriticalPathResult } from "@/lib/critical-path";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Chemin critique (Project Studio §19) — CPM sur les tâches et leurs dépendances. */
export function CriticalPathView({
  results,
  projectEndDays,
  anchorDate,
  projectDateFin,
}: {
  results: CriticalPathResult[] | null;
  projectEndDays: number | null;
  anchorDate: string | null;
  projectDateFin: string | null;
}) {
  if (results === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune tâche datée pour ce projet, ou un cycle de dépendances empêche le calcul du chemin critique.
      </p>
    );
  }

  const anchor = anchorDate ? new Date(anchorDate) : null;
  const computedEnd = anchor && projectEndDays !== null ? addDays(anchor, projectEndDays) : null;
  const plannedEnd = projectDateFin ? new Date(projectDateFin) : null;
  const impactJours =
    computedEnd && plannedEnd ? Math.round((computedEnd.getTime() - plannedEnd.getTime()) / DAY_MS) : null;

  const criticalTasks = results.filter((r) => r.critique).sort((a, b) => a.debutAuPlusTot - b.debutAuPlusTot);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="px-(--card-spacing)">
            <div className="text-xs text-muted-foreground">Tâches critiques</div>
            <div className="text-lg font-semibold">{criticalTasks.length}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="px-(--card-spacing)">
            <div className="text-xs text-muted-foreground">Durée totale calculée</div>
            <div className="text-lg font-semibold">{projectEndDays} jour(s)</div>
          </CardContent>
        </Card>
        <Card size="sm" accent={impactJours !== null && impactJours > 0 ? "destructive" : undefined}>
          <CardContent className="px-(--card-spacing)">
            <div className="text-xs text-muted-foreground">Impact sur la date finale</div>
            <div className="text-lg font-semibold">
              {impactJours === null
                ? "—"
                : impactJours > 0
                  ? `+${impactJours} j de retard potentiel`
                  : "Dans les délais"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2">Tâche</th>
              <th className="p-2">Durée</th>
              <th className="p-2">Début au plus tôt</th>
              <th className="p-2">Fin au plus tôt</th>
              <th className="p-2">Début au plus tard</th>
              <th className="p-2">Fin au plus tard</th>
              <th className="p-2">Marge</th>
              <th className="p-2">Critique</th>
            </tr>
          </thead>
          <tbody>
            {[...results]
              .sort((a, b) => a.debutAuPlusTot - b.debutAuPlusTot)
              .map((r) => (
                <tr key={r.id} className={`border-b ${r.critique ? "bg-destructive/5" : ""}`}>
                  <td className="p-2">
                    <Link href={`/taches/${r.id}`} className="font-medium hover:underline">
                      {r.titre}
                    </Link>
                  </td>
                  <td className="p-2">{r.dureeJours} j</td>
                  <td className="p-2">{r.debutAuPlusTot} j</td>
                  <td className="p-2">{r.finAuPlusTot} j</td>
                  <td className="p-2">{r.debutAuPlusTard} j</td>
                  <td className="p-2">{r.finAuPlusTard} j</td>
                  <td className="p-2">{r.marge} j</td>
                  <td className="p-2">{r.critique && <Badge variant="destructive">Critique</Badge>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Jours comptés depuis le début du projet (jour 0). Une marge de 0 signale une tâche critique : tout retard s&apos;y
        répercute directement sur la date de fin.
      </p>
    </div>
  );
}
