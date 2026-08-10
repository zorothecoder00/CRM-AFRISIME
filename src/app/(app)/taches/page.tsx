import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListView, type TaskRow } from "@/components/tasks/task-list-view";
import { TaskKanbanView } from "@/components/tasks/task-kanban-view";

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; projetId?: string }>;
}) {
  const { vue = "liste", projetId } = await searchParams;

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where: projetId ? { projectId: projetId } : undefined,
      include: { project: true, responsablePrincipal: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      include: { sections: { select: { id: true, nom: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const taskRows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    titre: t.titre,
    projectNom: t.project.nom,
    statut: t.statut,
    priorite: t.priorite,
    echeance: t.echeance ? t.echeance.toISOString() : null,
    responsableNom: t.responsablePrincipal.name,
    avancement: t.avancement,
  }));

  const projectOptions = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    sections: p.sections.map((s) => ({ id: s.id, label: s.nom })),
  }));

  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tâches</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tâche(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Link href={`?vue=liste${projetId ? `&projetId=${projetId}` : ""}`}>
              <Button variant={vue === "liste" ? "default" : "ghost"} size="sm" className="rounded-r-none">
                Liste
              </Button>
            </Link>
            <Link href={`?vue=kanban${projetId ? `&projetId=${projetId}` : ""}`}>
              <Button variant={vue === "kanban" ? "default" : "ghost"} size="sm" className="rounded-l-none">
                Kanban
              </Button>
            </Link>
          </div>
          <TaskFormDialog projects={projectOptions} users={userOptions} />
        </div>
      </div>

      {vue === "kanban" ? <TaskKanbanView tasks={taskRows} /> : <TaskListView tasks={taskRows} />}
    </div>
  );
}
