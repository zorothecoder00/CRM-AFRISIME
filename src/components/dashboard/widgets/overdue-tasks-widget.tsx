import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "@/lib/dashboard-data";

export function OverdueTasksWidget({
  tasks,
  total,
}: {
  tasks: DashboardData["overdueTasks"];
  total: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Tâches en retard</CardTitle>
        <Badge variant="destructive">{total}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune tâche en retard.</p>
        )}
        {tasks.map((t) => (
          <Link
            key={t.id}
            href={`/taches/${t.id}`}
            className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
          >
            <div>
              <div className="font-medium text-destructive">{t.titre}</div>
              <div className="text-xs text-muted-foreground">
                {t.projectNom} · {t.responsableName}
              </div>
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(t.echeance).toLocaleDateString("fr-FR")}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
