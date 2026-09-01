import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListView, type TaskRow } from "@/components/tasks/task-list-view";
import { TaskKanbanView } from "@/components/tasks/task-kanban-view";
import { TaskTimelineView } from "@/components/tasks/task-timeline-view";
import { TaskGanttView, type GanttTaskRow } from "@/components/tasks/task-gantt-view";
import { TaskMindMapView, type MindMapTaskRow } from "@/components/tasks/task-mindmap-view";
import { TaskPortfolioView } from "@/components/tasks/task-portfolio-view";
import { TaskWhiteboardView } from "@/components/tasks/task-whiteboard-view";
import { TaskViewSwitcher } from "@/components/tasks/task-view-switcher";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ProjectFilter } from "@/components/ui/project-filter";
import { TaskPriorityFilter } from "@/components/ui/task-priority-filter";
import { TaskStatusFilter } from "@/components/ui/task-status-filter";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { buildDateRangeFilter } from "@/lib/date-filter";
import type { WhiteboardNote } from "@/actions/whiteboard.actions";
import type { Prisma } from "@/generated/prisma/client";

/**
 * "Mes tâches" (prototype V2) — page dédiée au module Planning personnel :
 * même contenu/filtres/vues que /taches (page générale), mais strictement
 * mes tâches (responsable principal ou assigné), sans condition ni
 * échappatoire — même pour un super admin. Pas de taskScope/entityScope
 * (visibilité des autres rôles) : ceux-là n'ont de sens que sur la page
 * générale, hors de propos ici.
 */
export default async function PersonalPlanningMesTachesPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; projetId?: string; annee?: string; mois?: string; priorite?: string; statut?: string }>;
}) {
  const { vue: vueParam, projetId, annee, mois, priorite, statut } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canCreate = session!.user.permissions.includes(PERMISSIONS.TASK_CREATE);
  const canManage = session!.user.permissions.includes(PERMISSIONS.TASK_UPDATE);
  const canDelete = session!.user.permissions.includes(PERMISSIONS.TASK_DELETE);

  const dateRange = buildDateRangeFilter(annee, mois);

  let vue = vueParam;
  if (!vue) {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { defaultTaskView: true } });
    vue = me?.defaultTaskView ?? "liste";
  }

  const andClauses: Prisma.TaskWhereInput[] = [
    { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
  ];
  if (dateRange) andClauses.push({ echeance: dateRange });
  if (priorite) andClauses.push({ priorite: priorite as never });
  if (statut) andClauses.push({ statut: statut as never });

  const [tasks, projects, users, objectives, plans, competences, whiteboard] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: projetId || undefined, deletedAt: null, AND: andClauses },
      include: { project: true, responsablePrincipal: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { members: { some: { userId } } },
      include: { sections: { select: { id: true, nom: true } } },
      orderBy: { nom: "asc" },
    }),
    canCreate || canManage
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canCreate
      ? prisma.objective.findMany({ orderBy: { titre: "asc" }, select: { id: true, titre: true } })
      : Promise.resolve([]),
    canCreate
      ? prisma.plan.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } })
      : Promise.resolve([]),
    canCreate
      ? prisma.competence.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } })
      : Promise.resolve([]),
    vue === "blanc" && projetId
      ? prisma.whiteboard.findUnique({ where: { projectId: projetId } })
      : Promise.resolve(null),
  ]);

  // Une sous-tâche est un Task comme un autre (parentTaskId non nul) : elle a
  // déjà sa place dans "Sous-tâches" sur la fiche de sa tâche mère
  // (/taches/[taskId]). Seule Mind Map reconstruit une vraie hiérarchie ; les
  // autres vues sont plates et n'affichent que les tâches racines.
  const toTaskRow = (t: (typeof tasks)[number]): TaskRow => ({
    id: t.id,
    titre: t.titre,
    description: t.description,
    projectNom: t.project.nom,
    statut: t.statut,
    priorite: t.priorite,
    responsablePrincipalId: t.responsablePrincipalId,
    responsableNom: t.responsablePrincipal.name,
    dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
    echeance: t.echeance ? t.echeance.toISOString() : null,
    tempsEstimeHeures: t.tempsEstimeHeures ? Number(t.tempsEstimeHeures) : null,
    avancement: t.avancement,
  });

  const topLevelTasks = tasks.filter((t) => !t.parentTaskId);
  const taskRows: TaskRow[] = topLevelTasks.map(toTaskRow);

  const ganttRows: GanttTaskRow[] = topLevelTasks.map((t) => ({
    ...toTaskRow(t),
    dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
  }));

  const mindMapRows: MindMapTaskRow[] = tasks.map((t) => ({
    ...toTaskRow(t),
    dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
    parentTaskId: t.parentTaskId,
  }));

  const projectOptions = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    sections: p.sections.map((s) => ({ id: s.id, label: s.nom })),
  }));

  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));

  return (
    <div className="space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mes tâches</h1>
          <p className="text-sm text-muted-foreground">{taskRows.length} tâche(s) — assignées à moi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectFilter projects={projectOptions.map((p) => ({ id: p.id, label: p.nom }))} />
          <TaskPriorityFilter />
          <TaskStatusFilter />
          <PeriodFilter dateLabel="Échéance" />
          <TaskViewSwitcher activeVue={vue} projetId={projetId} onlyMine={false} annee={annee} mois={mois} />
          {canCreate && (
            <TaskFormDialog
              projects={projectOptions}
              users={userOptions}
              objectives={objectives.map((o) => ({ id: o.id, label: o.titre }))}
              plans={plans.map((p) => ({ id: p.id, label: p.nom }))}
              competences={competences.map((c) => ({ id: c.id, label: c.nom }))}
            />
          )}
        </div>
      </div>

      {vue === "kanban" && (
        <TaskKanbanView tasks={taskRows} users={userOptions} canManage={canManage} canDelete={canDelete} />
      )}
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
            Filtrez par projet pour ouvrir son tableau blanc (le tableau blanc est propre à chaque projet).
          </p>
        ))}
      {vue === "liste" && (
        <TaskListView tasks={taskRows} users={userOptions} canManage={canManage} canDelete={canDelete} />
      )}
    </div>
  );
}
