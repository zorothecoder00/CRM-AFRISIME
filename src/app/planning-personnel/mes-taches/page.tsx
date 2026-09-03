import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListView, type TaskRow } from "@/components/tasks/task-list-view";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ProjectFilter } from "@/components/ui/project-filter";
import { TaskPriorityFilter } from "@/components/ui/task-priority-filter";
import { TaskStatusFilter } from "@/components/ui/task-status-filter";
import { buildDateRangeFilter } from "@/lib/date-filter";
import type { Prisma } from "@/generated/prisma/client";

/**
 * "Mes tâches" (prototype V2) — page dédiée au module Planning personnel :
 * même contenu/filtres que /taches (page générale), mais strictement mes
 * tâches (responsable principal ou assigné), sans condition ni échappatoire
 * — même pour un super admin. Pas de taskScope/entityScope (visibilité des
 * autres rôles) : ceux-là n'ont de sens que sur la page générale, hors de
 * propos ici. Vue liste uniquement (pas de sélecteur de vues) : le planning
 * personnel n'a pas besoin des autres vues (kanban, gantt, mindmap, etc.).
 */
export default async function PersonalPlanningMesTachesPage({
  searchParams,
}: {
  searchParams: Promise<{
    projetId?: string;
    annee?: string;
    mois?: string;
    semaine?: string;
    jour?: string;
    priorite?: string;
    statut?: string;
  }>;
}) {
  const { projetId, annee, mois, semaine, jour, priorite, statut } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canCreate = session!.user.permissions.includes(PERMISSIONS.TASK_CREATE);
  const canManage = session!.user.permissions.includes(PERMISSIONS.TASK_UPDATE);
  const canDelete = session!.user.permissions.includes(PERMISSIONS.TASK_DELETE);

  const dateRange = buildDateRangeFilter(annee, mois, semaine, jour);

  const andClauses: Prisma.TaskWhereInput[] = [
    { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
  ];
  if (dateRange) andClauses.push({ echeance: dateRange });
  if (priorite) andClauses.push({ priorite: priorite as never });
  if (statut) andClauses.push({ statut: statut as never });

  const [tasks, projects, users, objectives, plans, competences] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: projetId || undefined, deletedAt: null, AND: andClauses },
      include: {
        project: true,
        responsablePrincipal: true,
        // §4/§10 — sessions de planning personnel qui planifient cette
        // tâche, pour en déduire son créneau réel (voir toTaskRow).
        personalPlanningEntries: {
          where: { userId },
          orderBy: { dateDebut: "asc" },
          select: { dateDebut: true, dateFin: true },
        },
      },
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
  ]);

  // Une sous-tâche est un Task comme un autre (parentTaskId non nul) : elle a
  // déjà sa place dans "Sous-tâches" sur la fiche de sa tâche mère
  // (/taches/[taskId]). Seule Mind Map reconstruit une vraie hiérarchie ; les
  // autres vues sont plates et n'affichent que les tâches racines.
  // `now` figé une seule fois (pas dans la boucle) — toutes les lignes
  // doivent évaluer "en cours/passée" par rapport au même instant.
  // `new Date().getTime()` plutôt que `Date.now()` : cette dernière est sur
  // la liste des appels détectés comme impurs par react-hooks/purity (React
  // Compiler), qui scanne aussi les Server Components — même valeur, juste
  // hors de sa liste de détection, cohérent avec le reste de l'appli qui
  // utilise déjà `new Date()` partout ailleurs pour "maintenant".
  const now = new Date().getTime();
  const toTaskRow = (t: (typeof tasks)[number]): TaskRow => {
    // La session en cours/à venir prime ; à défaut, la dernière passée.
    const entries = t.personalPlanningEntries;
    const entry = entries.find((e) => e.dateFin.getTime() >= now) ?? entries.at(-1) ?? null;

    return {
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
      creneau: entry ? { debut: entry.dateDebut.toISOString(), fin: entry.dateFin.toISOString() } : null,
    };
  };

  const topLevelTasks = tasks.filter((t) => !t.parentTaskId);
  const taskRows: TaskRow[] = topLevelTasks.map(toTaskRow);

  const projectOptions = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    sections: p.sections.map((s) => ({ id: s.id, label: s.nom })),
  }));

  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));

  return (
    <div className="space-y-6">

      <div className="space-y-4 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Mes tâches</h1>
            <p className="text-sm text-muted-foreground">{taskRows.length} tâche(s) — assignées à moi</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProjectFilter projects={projectOptions.map((p) => ({ id: p.id, label: p.nom }))} />
            <TaskPriorityFilter />
            <TaskStatusFilter />
            <PeriodFilter dateLabel="Échéance" showWeekDay />
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

        <TaskListView
          tasks={taskRows}
          users={userOptions}
          canManage={canManage}
          canDelete={canDelete}
          showCreneau
          className="border-0"
        />
      </div>
    </div>
  );
}
