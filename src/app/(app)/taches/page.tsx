import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { projectVisibilityWhere, taskVisibilityWhere } from "@/lib/portal-scope";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListView, type TaskRow } from "@/components/tasks/task-list-view";
import { TaskKanbanView } from "@/components/tasks/task-kanban-view";
import { TaskTimelineView } from "@/components/tasks/task-timeline-view";
import { TaskGanttView, type GanttTaskRow } from "@/components/tasks/task-gantt-view";
import { TaskMindMapView, type MindMapTaskRow } from "@/components/tasks/task-mindmap-view";
import { TaskPortfolioView } from "@/components/tasks/task-portfolio-view";
import { TaskWhiteboardView } from "@/components/tasks/task-whiteboard-view";
import { TaskViewSwitcher } from "@/components/tasks/task-view-switcher";
import type { WhiteboardNote } from "@/actions/whiteboard.actions";
import type { Prisma } from "@/generated/prisma/client";
import { User } from "lucide-react";

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; projetId?: string; mine?: string }>;
}) {
  const { vue: vueParam, projetId, mine } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canCreate = session!.user.permissions.includes(PERMISSIONS.TASK_CREATE);

  // Vue par defaut (cahier des charges §7 : "chaque utilisateur choisit sa
  // vue") : sans ?vue= explicite dans l'URL, on retombe sur la preference
  // memorisee de l'utilisateur plutot que sur "liste" en dur.
  let vue = vueParam;
  if (!vue) {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { defaultTaskView: true } });
    vue = me?.defaultTaskView ?? "liste";
  }
  const taskScope = taskVisibilityWhere(session!.user.roleKey, session!.user.id);
  const projectScope = projectVisibilityWhere(session!.user.roleKey, session!.user.id);
  const onlyMine = mine === "1";

  // Filtre "Mes tâches" : responsable principal OU assigné, combiné (pas
  // fusionné) avec le taskScope des rôles externes qui a déjà son propre OR.
  const andClauses: Prisma.TaskWhereInput[] = [];
  if (taskScope) andClauses.push(taskScope);
  if (onlyMine) {
    andClauses.push({ OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] });
  }

  const [tasks, projects, users, objectives, plans, whiteboard] = await Promise.all([
    prisma.task.findMany({
      where: {
        projectId: projetId || undefined,
        ...(andClauses.length > 0 ? { AND: andClauses } : {}),
      },
      include: { project: true, responsablePrincipal: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: projectScope,
      include: { sections: { select: { id: true, nom: true } } },
      orderBy: { nom: "asc" },
    }),
    canCreate
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canCreate
      ? prisma.objective.findMany({ orderBy: { titre: "asc" }, select: { id: true, titre: true } })
      : Promise.resolve([]),
    canCreate
      ? prisma.plan.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } })
      : Promise.resolve([]),
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

  const mineHref = `?vue=${vue}${projetId ? `&projetId=${projetId}` : ""}${onlyMine ? "" : "&mine=1"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tâches</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tâche(s){onlyMine ? " — assignées à moi" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={mineHref}>
            <Button variant={onlyMine ? "default" : "outline"} size="sm">
              <User className="mr-1 h-4 w-4" />
              Mes tâches
            </Button>
          </Link>
          <TaskViewSwitcher activeVue={vue} projetId={projetId} onlyMine={onlyMine} />
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
          {canCreate && (
            <TaskFormDialog
              projects={projectOptions}
              users={userOptions}
              objectives={objectives.map((o) => ({ id: o.id, label: o.titre }))}
              plans={plans.map((p) => ({ id: p.id, label: p.nom }))}
            />
          )}
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
