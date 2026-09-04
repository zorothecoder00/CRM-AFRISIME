import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskRow } from "@/components/tasks/task-list-view";

type ProjectSummary = {
  id: string;
  nom: string;
};

const DONE_STATUS = "TERMINEE";
const LATE_STATUSES = new Set(["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE", "REPORTEE"]);

/** Vue Portefeuille (cahier des charges §7) : tâches regroupées par projet, avec avancement global. */
export function TaskPortfolioView({
  tasks,
  projects,
}: {
  tasks: TaskRow[];
  projects: ProjectSummary[];
}) {
  const tasksByProject = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    const list = tasksByProject.get(task.projectNom) ?? [];
    list.push(task);
    tasksByProject.set(task.projectNom, list);
  }

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun projet.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const projectTasks = tasksByProject.get(project.nom) ?? [];
        const total = projectTasks.length;
        const done = projectTasks.filter((t) => t.statut === DONE_STATUS).length;
        const late = projectTasks.filter(
          (t) => LATE_STATUSES.has(t.statut) && t.echeance && t.echeance.slice(0, 10) < new Date().toISOString().slice(0, 10)
        ).length;
        const avgAvancement =
          total > 0 ? Math.round(projectTasks.reduce((sum, t) => sum + t.avancement, 0) / total) : 0;

        return (
          <Link key={project.id} href={`/projets/${project.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">{project.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tâches</span>
                  <span>
                    {done}/{total} terminées
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${avgAvancement}%` }} />
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avancement moyen</span>
                  <span>{avgAvancement}%</span>
                </div>
                {late > 0 && <p className="text-xs text-destructive">{late} tâche(s) en retard</p>}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
