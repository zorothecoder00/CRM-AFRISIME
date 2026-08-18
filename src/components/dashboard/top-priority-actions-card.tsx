import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import type { TaskPriorityScore } from "@/lib/task-priority";

// Moteur de priorisation IA (cahier des charges V2.2 §40) — "Top 5 des
// actions à réaliser aujourd'hui", voir src/lib/task-priority.ts.
export function TopPriorityActionsCard({ actions }: { actions: TaskPriorityScore[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Target className="size-4 text-muted-foreground" />
        <CardTitle className="text-base">Top 5 des actions à réaliser aujourd&apos;hui</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune tâche active à prioriser.</p>
        ) : (
          <ol className="space-y-2">
            {actions.map((a, i) => (
              <li key={a.taskId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <Link href={a.href} className="truncate font-medium hover:underline">
                    {a.titre}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.projectNom}</span>
                </span>
                <Badge variant="outline" className="shrink-0">
                  {a.score}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
