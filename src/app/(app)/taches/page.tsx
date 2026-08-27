import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { projectVisibilityWhere, taskVisibilityWhere } from "@/lib/portal-scope";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
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
import { PeriodFilter } from "@/components/ui/period-filter";
import { ProjectFilter } from "@/components/ui/project-filter";
import { buildDateRangeFilter } from "@/lib/date-filter";
import type { WhiteboardNote } from "@/actions/whiteboard.actions";
import type { Prisma } from "@/generated/prisma/client";
import { User } from "lucide-react";

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; projetId?: string; mine?: string; annee?: string; mois?: string }>;
}) {
  const { vue: vueParam, projetId, mine, annee, mois } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canCreate = session!.user.permissions.includes(PERMISSIONS.TASK_CREATE);
  const canManage = session!.user.permissions.includes(PERMISSIONS.TASK_UPDATE);
  const canDelete = session!.user.permissions.includes(PERMISSIONS.TASK_DELETE);

  // Vue par defaut (cahier des charges §7 : "chaque utilisateur choisit sa
  // vue") : sans ?vue= explicite dans l'URL, on retombe sur la preference
  // memorisee de l'utilisateur plutot que sur "liste" en dur.
  const taskScope = taskVisibilityWhere(session!.user.roleKey, session!.user.id);
  const projectScope = projectVisibilityWhere(session!.user.roleKey, session!.user.id);
  const onlyMine = mine === "1";
  // Filtre annuel/mensuel — sur l'échéance, déjà affichée en colonne.
  const dateRange = buildDateRangeFilter(annee, mois);

  // Multi-tenant Phase 2 (lecture) — toutes les requêtes de cette page,
  // y compris celles des helpers partagés (entity-scope), passent par le
  // client scopé à l'organisation de la session plutôt que le client global.
  // `vue` est résolu à l'intérieur puis renvoyé (pas de réassignation d'une
  // variable capturée depuis la closure imbriquée — interdit par la règle
  // d'immutabilité du React Compiler) et réaffecté juste après, comme avant.
  const { tasks, projects, users, objectives, plans, competences, whiteboard, resolvedVue } = await withTenantScopedSession(
    session!.user.organizationId,
    async (tx) => {
      let resolvedVue = vueParam;
      if (!resolvedVue) {
        const me = await tx.user.findUnique({ where: { id: userId }, select: { defaultTaskView: true } });
        resolvedVue = me?.defaultTaskView ?? "liste";
      }

      // Filtre "Mes tâches" : responsable principal OU assigné, combiné (pas
      // fusionné) avec le taskScope des rôles externes qui a déjà son propre OR.
      const andClauses: Prisma.TaskWhereInput[] = [];
      if (taskScope) andClauses.push(taskScope);
      if (onlyMine) {
        andClauses.push({ OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] });
      }
      // Isolation multi-entites (cahier des charges V2.2 §22) — voir entity-scope.ts.
      const entityScope = await getUserEntityScope(userId, session!.user.permissions, tx);
      const allowedDepartmentIds = await getAllowedDepartmentIds(entityScope, tx);
      if (allowedDepartmentIds) {
        andClauses.push({ project: { departmentId: { in: allowedDepartmentIds } } });
      }
      if (dateRange) andClauses.push({ echeance: dateRange });

      const [tasks, projects, users, objectives, plans, competences, whiteboard] = await Promise.all([
        tx.task.findMany({
          where: {
            projectId: projetId || undefined,
            // Corbeille (V2.2 §37) : une tache supprimee n'apparait plus ici.
            deletedAt: null,
            ...(andClauses.length > 0 ? { AND: andClauses } : {}),
          },
          include: { project: true, responsablePrincipal: true },
          orderBy: { createdAt: "desc" },
        }),
        tx.project.findMany({
          where: projectScope,
          include: { sections: { select: { id: true, nom: true } } },
          orderBy: { nom: "asc" },
        }),
        canCreate || canManage
          ? tx.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
          : Promise.resolve([]),
        canCreate
          ? tx.objective.findMany({ orderBy: { titre: "asc" }, select: { id: true, titre: true } })
          : Promise.resolve([]),
        canCreate
          ? tx.plan.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } })
          : Promise.resolve([]),
        canCreate
          ? tx.competence.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } })
          : Promise.resolve([]),
        resolvedVue === "blanc" && projetId
          ? tx.whiteboard.findUnique({ where: { projectId: projetId } })
          : Promise.resolve(null),
      ]);

      return { tasks, projects, users, objectives, plans, competences, whiteboard, resolvedVue };
    }
  );
  const vue = resolvedVue;

  // Une sous-tâche est un Task comme un autre (parentTaskId non nul, voir
  // schema.prisma) : elle a déjà sa place dans "Sous-tâches" sur la fiche de
  // sa tâche mère (/taches/[taskId]). Seule Mind Map reconstruit une vraie
  // hiérarchie à partir de parentTaskId (voir task-mindmap-view.tsx) ; toutes
  // les autres vues (Liste/Kanban/Chronologie/Gantt/Portefeuille) sont plates
  // et n'affichent donc que les tâches racines pour éviter le doublon visuel.
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

  const periodQuery = `${annee ? `&annee=${annee}` : ""}${annee && mois ? `&mois=${mois}` : ""}`;
  const mineHref = `?vue=${vue}${projetId ? `&projetId=${projetId}` : ""}${onlyMine ? "" : "&mine=1"}${periodQuery}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tâches</h1>
          <p className="text-sm text-muted-foreground">
            {taskRows.length} tâche(s){onlyMine ? " — assignées à moi" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectFilter projects={projectOptions.map((p) => ({ id: p.id, label: p.nom }))} />
          <PeriodFilter dateLabel="Échéance" />
          <Link href={mineHref}>
            <Button variant={onlyMine ? "default" : "outline"} size="sm">
              <User className="mr-1 h-4 w-4" />
              Mes tâches
            </Button>
          </Link>
          <TaskViewSwitcher activeVue={vue} projetId={projetId} onlyMine={onlyMine} annee={annee} mois={mois} />
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
            Filtrez par projet pour ouvrir son tableau blanc (le tableau blanc est propre à chaque
            projet).
          </p>
        ))}
      {vue === "liste" && (
        <TaskListView tasks={taskRows} users={userOptions} canManage={canManage} canDelete={canDelete} />
      )}
    </div>
  );
}
