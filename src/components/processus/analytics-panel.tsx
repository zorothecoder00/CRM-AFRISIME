import type { ProcessusAnalytics } from "@/lib/processus-analytics";
import { Badge } from "@/components/ui/badge";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: ProcessusAnalytics }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Durée moyenne"
          value={analytics.dureeMoyenneHeures !== null ? `${analytics.dureeMoyenneHeures} h` : "—"}
        />
        <StatCard label="Performance" value={`${analytics.performancePct} %`} />
        <StatCard label="Taux de rejet" value={`${analytics.tauxRejetPct} %`} />
        <StatCard label="Taux d'erreur" value={`${analytics.tauxErreurPct} %`} />
        <StatCard label="Dossiers en attente" value={String(analytics.dossiersEnAttente)} />
        <StatCard label="Total exécutions" value={String(analytics.totalExecutions)} />
      </div>

      {analytics.goulotEtapeNom && (
        <p className="text-sm text-muted-foreground">
          Goulot d&apos;étranglement : <Badge variant="warning">{analytics.goulotEtapeNom}</Badge>
        </p>
      )}

      {analytics.tempsParEtape.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Temps moyen par étape</p>
          {analytics.tempsParEtape.map((e) => (
            <div key={e.etapeId} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{e.etapeNom}</span>
              <span className="tabular-nums text-muted-foreground">
                {e.dureeMoyenneHeures !== null ? `${e.dureeMoyenneHeures} h` : "—"}
                {e.dossiersEnCours > 0 ? ` · ${e.dossiersEnCours} en cours` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
