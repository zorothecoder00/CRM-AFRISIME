import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListView, type TaskRow } from "@/components/tasks/task-list-view";
import { TaskKanbanView } from "@/components/tasks/task-kanban-view";
import { TaskTimelineView } from "@/components/tasks/task-timeline-view";
import { TaskGanttView, type GanttTaskRow } from "@/components/tasks/task-gantt-view";
import { TaskMindMapView, type MindMapTaskRow } from "@/components/tasks/task-mindmap-view";
import { TaskPortfolioView } from "@/components/tasks/task-portfolio-view";
import { TaskWhiteboardView } from "@/components/tasks/task-whiteboard-view";
import type { WhiteboardNote } from "@/actions/whiteboard.actions";

const VIEWS = [
  { key: "liste", label: "Liste" },
  { key: "kanban", label: "Kanban" },
  { key: "chronologie", label: "Chronologie" },
  { key: "gantt", label: "Gantt" },
  { key: "mindmap", label: "Mind Map" },
  { key: "portefeuille", label: "Portefeuille" },
  { key: "blanc", label: "Tableau blanc" },
] as const;

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; projetId?: string }>;
}) {
  const { vue = "liste", projetId } = await searchParams;

  const [tasks, projects, users, whiteboard] = await Promise.all([
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
    vue === "blanc" && projetId
      ? prisma.whiteboard.findUnique({ where: { projectId: projetId } })
      : Promise.resolve(null),
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

  const ganttRows: GanttTaskRow[] = tasks.map((t, i) => ({
    ...taskRows[i],
    dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
  }));

  const mindMapRows: MindMapTaskRow[] = tasks.map((t, i) => ({
    ...taskRows[i],
    parentTaskId: t.parentTaskId,
  }));

  const projectOptions = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    sections: p.sections.map((s) => ({ id: s.id, label: s.nom })),
  }));

  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));

  function withVue(key: string) {
    return `?vue=${key}${projetId ? `&projetId=${projetId}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tâches</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tâche(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-md border">
            {VIEWS.map((v, i) => (
              <Link key={v.key} href={withVue(v.key)}>
                <Button
                  variant={vue === v.key ? "default" : "ghost"}
                  size="sm"
                  className={i === 0 ? "rounded-r-none" : i === VIEWS.length - 1 ? "rounded-l-none" : "rounded-none"}
                >
                  {v.label}
                </Button>
              </Link>
            ))}
          </div>
          <div className="flex rounded-md border">
            <Link href="/calendrier">
              <Button variant="ghost" size="sm" className="rounded-r-none">
                Calendrier
              </Button>
            </Link>
            <Link href="/charge-de-travail">
              <Button variant="ghost" size="sm" className="rounded-l-none">
                Charge de travail
              </Button>
            </Link>
          </div>
          <TaskFormDialog projects={projectOptions} users={userOptions} />
        </div>
      </div>

      {vue === "kanban" && <TaskKanbanView tasks={taskRows} />}
      {vue === "chronologie" && <TaskTimelineView tasks={taskRows} />}
      {vue === "gantt" && <TaskGanttView tasks={ganttRows} />}
      {vue === "mindmap" && <TaskMindMapView tasks={mindMapRows} />}
      {vue === "portefeuille" && <TaskPortfolioView tasks={taskRows} projects={projectOptions} />}
      {vue === "blanc" &&
        (projetId ? (
          <TaskWhiteboardView
            projectId={projetId}
            initialNotes={(whiteboard?.content as WhiteboardNote[] | undefined) ?? []}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Filtrez par projet pour ouvrir son tableau blanc (le tableau blanc est propre à chaque
            projet).
          </p>
        ))}
      {vue === "liste" && <TaskListView tasks={taskRows} />}
    </div>
  );
}
