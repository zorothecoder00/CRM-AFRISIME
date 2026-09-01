import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";

/** Widget "Planning Health" du hub (§43) — version carte du badge, avec barre de progression. */
export function PersonalPlanningHealthCard({ score }: { score: number }) {
  const tone = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const barTone = score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive";

  return (
    <Card id="planning-health">
      <CardHeader className="flex flex-row items-center gap-2">
        <Gauge className={`size-5 ${tone}`} />
        <CardTitle className="text-base">Planning Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className={`text-2xl font-bold ${tone}`}>
          {score}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${barTone}`} style={{ width: `${score}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          Tâches planifiées · échéances · surcharge · non planifiées · retards · conflits · reports
        </p>
      </CardContent>
    </Card>
  );
}
