import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { TaskStatus } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { objectiveProgress } from "@/lib/objective-progress";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const ACTIVE_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const mineFilter: Prisma.TaskWhereInput = {
    OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
  };

  const [todayTasks, overdueTasks, weekTasks, myProjects, myObjectives] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...mineFilter,
        statut: { in: ACTIVE_STATUSES },
        echeance: { gte: todayStart, lte: todayEnd },
      },
      include: { project: { select: { nom: true } } },
      orderBy: { echeance: "asc" },
    }),
    prisma.task.findMany({
      where: {
        ...mineFilter,
        statut: { in: ACTIVE_STATUSES },
        echeance: { lt: todayStart },
      },
      include: { project: { select: { nom: true } } },
      orderBy: { echeance: "asc" },
    }),
    prisma.task.findMany({
      where: {
        ...mineFilter,
        statut: { in: ACTIVE_STATUSES },
        echeance: { gt: todayEnd, lte: weekEnd },
      },
      include: { project: { select: { nom: true } } },
      orderBy: { echeance: "asc" },
    }),
    prisma.project.findMany({
      where: {
        OR: [{ responsableId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.objective.findMany({
      where: { userId, statut: "EN_COURS" },
      include: { indicators: true },
      orderBy: { dateFin: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue, {session!.user.name} — {session!.user.roleLabel}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <TaskWidget title="Mes tâches du jour" tasks={todayTasks} emptyLabel="Aucune tâche aujourd'hui." />
        <TaskWidget
          title="Mes tâches en retard"
          tasks={overdueTasks}
          emptyLabel="Aucune tâche en retard."
          highlight
        />
        <TaskWidget title="Mes tâches de la semaine" tasks={weekTasks} emptyLabel="Aucune tâche cette semaine." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes projets</CardTitle>
        </CardHeader>
        <CardContent>
          {myProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun projet pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {myProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projets/${project.id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{project.nom}</span>
                    <Badge variant="outline">{project.avancement}%</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes objectifs</CardTitle>
        </CardHeader>
        <CardContent>
          {myObjectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun objectif en cours.</p>
          ) : (
            <ul className="space-y-3">
              {myObjectives.map((objective) => {
                const progress = objectiveProgress(
                  objective.indicators.map((i) => ({
                    valeurActuelle: Number(i.valeurActuelle),
                    valeurCible: Number(i.valeurCible),
                  }))
                );
                return (
                  <li key={objective.id}>
                    <Link href={`/objectifs/${objective.id}`} className="block rounded-md border p-3 text-sm hover:bg-muted">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">{objective.titre}</span>
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type TaskWithProject = {
  id: string;
  titre: string;
  echeance: Date | null;
  project: { nom: string };
};

function TaskWidget({
  title,
  tasks,
  emptyLabel,
  highlight,
}: {
  title: string;
  tasks: TaskWithProject[];
  emptyLabel: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/taches/${task.id}`}
                  className="flex flex-col rounded-md border p-2 text-sm hover:bg-muted"
                >
                  <span className={highlight ? "font-medium text-destructive" : "font-medium"}>
                    {task.titre}
                  </span>
                  <span className="text-xs text-muted-foreground">{task.project.nom}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
