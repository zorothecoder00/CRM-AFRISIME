import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TriangleAlert } from "lucide-react";

export type PersonalPerformanceStats = {
  tauxExecution: number;
  tachesTerminees: number;
  tachesEnRetard: number;
  tachesBloquees: number;
  respectDesEcheances: number | null;
  chargeMoyenne: number;
  tempsPlanifieHeures: number;
  tempsReelHeures: number;
};

/** §35 « Ma performance » + §36 (garde-fou anti-surveillance, affiché explicitement, pas en aparté). */
export function PersonalPerformance({ stats }: { stats: PersonalPerformanceStats }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <CardTitle className="text-base">Ma performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Taux d'exécution" value={`${stats.tauxExecution}%`} />
          <Stat label="Terminées" value={stats.tachesTerminees} />
          <Stat label="En retard" value={stats.tachesEnRetard} tone={stats.tachesEnRetard > 0 ? "text-destructive" : undefined} />
          <Stat label="Bloquées" value={stats.tachesBloquees} tone={stats.tachesBloquees > 0 ? "text-warning" : undefined} />
          <Stat label="Respect des échéances" value={stats.respectDesEcheances !== null ? `${stats.respectDesEcheances}%` : "—"} />
          <Stat label="Charge moyenne" value={`${stats.chargeMoyenne}%`} />
          <Stat label="Temps planifié" value={`${stats.tempsPlanifieHeures}h`} />
          <Stat label="Temps réellement consacré" value={`${stats.tempsReelHeures}h`} />
        </div>

        <div className="flex items-start gap-2 rounded-md border border-info/40 bg-info/5 p-2.5 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
          <p>
            Ces indicateurs sont à interpréter avec leur contexte (dépendances, absences, urgences, changements de
            priorité, surcharge, blocages) — ce n&apos;est pas un outil de surveillance. Une personne avec 50 tâches
            n&apos;est pas nécessairement plus performante qu&apos;une personne qui en a 20.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className={`text-xl font-semibold ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
