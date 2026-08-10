import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/objectives/progress-bar";
import type { DashboardData } from "@/lib/dashboard-data";

export function DeadlineComplianceWidget({ data }: { data: DashboardData["deadlineCompliance"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Respect des délais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune tâche terminée avec échéance pour le moment.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold">{data.percentage}%</span>
              <span className="text-sm text-muted-foreground">
                terminées à temps ({data.onTime}/{data.total})
              </span>
            </div>
            <ProgressBar value={data.percentage ?? 0} />
            <p className="text-xs text-muted-foreground">{data.late} tâche(s) terminée(s) en retard.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
