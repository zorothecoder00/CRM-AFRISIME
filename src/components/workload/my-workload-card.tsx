import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";
import type { UserWorkload } from "@/lib/workload";
import { AlertTriangle } from "lucide-react";

export function MyWorkloadCard({ workload }: { workload: UserWorkload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ma charge de travail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workload.enSurcharge && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Vous êtes en surcharge ({workload.tauxOccupation}% de votre capacité).
          </div>
        )}
        {workload.enCongeAujourdhui && (
          <div className="rounded-md border p-2 text-sm text-muted-foreground">
            Vous êtes en congé approuvé aujourd&apos;hui.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Tâches actives" value={String(workload.tacheCount)} />
          <Stat label="Charge estimée" value={`${workload.chargeHeures}h`} />
          <Stat label="Capacité" value={`${workload.capaciteHeures}h / semaine`} />
          <Stat label="Disponibilité" value={`${workload.disponibiliteHeures}h`} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">Taux d&apos;occupation</span>
            <span>{workload.tauxOccupation}%</span>
          </div>
          <ProgressBar value={workload.tauxOccupation} />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Temps moyen de réalisation :</span>
          {workload.tempsMoyenRealisationHeures !== null ? (
            <Badge variant="outline">{workload.tempsMoyenRealisationHeures}h / tâche</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
