import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "@/lib/dashboard-data";

export function TeamProductivityWidget({ data }: { data: DashboardData["teamProductivity"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Productivité par équipe</CardTitle>
        <p className="text-xs text-muted-foreground">Tâches terminées ces 30 derniers jours, par projet.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune tâche terminée récemment.</p>
        )}
        {data.map((d) => (
          <Link
            key={d.projectId}
            href={`/projets/${d.projectId}`}
            className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
          >
            <span className="font-medium">{d.projectNom}</span>
            <Badge variant="secondary">{d.tachesTerminees} tâche(s)</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
