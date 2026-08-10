import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";
import type { DashboardData } from "@/lib/dashboard-data";

export function DepartmentPerformanceWidget({
  data,
}: {
  data: DashboardData["departmentPerformance"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance par département</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((d) => (
          <div key={d.departmentId}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{d.departmentName}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{d.activeProjects} projet(s)</span>
                {d.overdueCount > 0 && <Badge variant="destructive">{d.overdueCount} en retard</Badge>}
              </div>
            </div>
            <ProgressBar value={d.avgAvancement} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
