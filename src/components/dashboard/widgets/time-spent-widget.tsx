import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard-data";

export function TimeSpentWidget({
  data,
  total,
}: {
  data: DashboardData["timeSpent"];
  total: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.heures));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Temps passé</CardTitle>
        <span className="text-sm text-muted-foreground">{total} h au total</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 && <p className="text-sm text-muted-foreground">Aucun temps enregistré.</p>}
        {data.map((d) => (
          <Link key={d.projectId} href={`/projets/${d.projectId}`} className="block">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium hover:underline">{d.projectNom}</span>
              <span className="text-muted-foreground">{d.heures} h</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(d.heures / max) * 100}%` }}
              />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
