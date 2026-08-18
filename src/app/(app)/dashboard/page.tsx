import type { ReactNode } from "react";
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
import { KpiCard } from "@/components/ui/kpi-card";
import { computeWorkload } from "@/lib/workload";
import { cn } from "@/lib/utils";
import { toneForAdminRequestStatus } from "@/lib/status-tone";
import { generateDailyBriefing } from "@/lib/daily-briefing";
import { DailyBriefingCard } from "@/components/dashboard/daily-briefing-card";

// Ligne cliquable des widgets du dashboard : fond legerement teinte (au lieu
// de blanc sur blanc) + effet de survol anime (leger soulevement, halo
// colore). `block` par defaut pour ne pas casser les listes dont le contenu
// s'empile (titre + apercu sur plusieurs lignes) ; combiner avec "flex ..."
// pour les lignes sur une seule ligne (titre + meta a droite).
const ROW_LINK =
  "block rounded-lg border border-transparent bg-muted/40 px-3 py-2.5 text-sm ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5 hover:shadow-sm hover:ring-primary/10";

// Meme traitement de surface, sans interaction (evenements/conges : pas de lien).
const STATIC_ROW = "flex justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm";

const ADMIN_REQUEST_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  APPROUVEE: "Approuvée",
  REJETEE: "Rejetée",
};

const ACTION_LABELS: Record<string, string> = {
  "task.created": "a créé une tâche",
  "task.status_changed": "a changé le statut d'une tâche",
  "task.comment_added": "a commenté une tâche",
  "task.validation_submitted": "a soumis une tâche pour validation",
  "task.validation_step_approved": "a approuvé une étape de validation",
  "task.validation_step_rejected": "a refusé une étape de validation",
  "project.created": "a créé un projet",
  "section.created": "a créé une phase/lot",
  "document.created": "a ajouté un document",
};

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
  const briefing = await generateDailyBriefing(userId);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const mineFilter: Prisma.TaskWhereInput = {
    OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
  };

  const twoWeeksEnd = endOfDay(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));

  const [
    todayTasks,
    overdueTasks,
    weekTasks,
    myProjects,
    myObjectives,
    myMeetings,
    myEvents,
    myLeaves,
    myNotifications,
    myConversations,
    myDocuments,
    myAdminRequests,
    pendingApprovals,
    workloadUsers,
    workloadTasks,
    workloadLeaves,
    myProjectMemberships,
  ] = await Promise.all([
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
    prisma.meeting.findMany({
      where: {
        OR: [{ createdById: userId }, { participants: { some: { userId } } }],
        dateHeure: { gte: now },
      },
      orderBy: { dateHeure: "asc" },
      take: 5,
    }),
    prisma.event.findMany({
      where: { dateDebut: { gte: now, lte: twoWeeksEnd } },
      orderBy: { dateDebut: "asc" },
      take: 5,
    }),
    prisma.leave.findMany({
      where: { userId, statut: "APPROUVE", dateDebut: { gte: now, lte: twoWeeksEnd } },
      orderBy: { dateDebut: "asc" },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.conversation
      .findMany({
        where: { participants: { some: { userId } } },
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: true } },
          participants: { include: { user: true } },
        },
      })
      .then((rows) =>
        rows
          .filter((c) => c.messages.length > 0)
          .sort((a, b) => b.messages[0].createdAt.getTime() - a.messages[0].createdAt.getTime())
          .slice(0, 5)
      ),
    prisma.document.findMany({
      where: { uploadedById: userId, estArchive: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.adminRequest.findMany({
      where: { demandeurId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.taskApproval.findMany({
      where: { statut: "EN_ATTENTE", step: { approverRole: session!.user.roleKey as never }, run: { statut: "EN_COURS" } },
      include: { run: { include: { task: true } }, step: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, include: { role: true } }),
    prisma.task.findMany({ include: { assignees: { select: { userId: true } } } }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
  ]);

  const myPendingApprovals = pendingApprovals.filter((a) => a.step.ordre === a.run.currentOrdre);

  const myWorkload = computeWorkload(
    workloadUsers.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    workloadTasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    workloadLeaves.map((l) => ({
      userId: l.userId,
      dateDebut: l.dateDebut,
      dateFin: l.dateFin,
      statut: l.statut,
    }))
  ).find((w) => w.userId === userId);

  const myProjectIds = myProjectMemberships.map((m) => m.projectId);
  const myTaskIdsForActivity =
    myProjectIds.length > 0
      ? await prisma.task.findMany({ where: { projectId: { in: myProjectIds } }, select: { id: true } })
      : [];
  const teamActivity =
    myTaskIdsForActivity.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            entityType: "Task",
            entityId: { in: myTaskIdsForActivity.map((t) => t.id) },
            NOT: { userId },
          },
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue, {session!.user.name} — {session!.user.roleLabel}
        </p>
      </div>

      <DailyBriefingCard userName={session!.user.name} briefing={briefing} />

      <DashboardSection title="Aujourd'hui">
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
      </DashboardSection>

      <DashboardSection title="Mes indicateurs de performance">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Mon taux d'occupation"
            value={myWorkload ? `${myWorkload.tauxOccupation}%` : "—"}
            accent={myWorkload?.enSurcharge ? "destructive" : undefined}
          />
          <KpiCard
            label="Ma disponibilité restante"
            value={myWorkload ? `${myWorkload.disponibiliteHeures} h` : "—"}
          />
          <KpiCard
            label="Temps moyen de réalisation"
            value={myWorkload?.tempsMoyenRealisationHeures != null ? `${myWorkload.tempsMoyenRealisationHeures} h` : "—"}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="À traiter">
        <div className="grid gap-4 md:grid-cols-3">
          <Card accent={myPendingApprovals.length > 0 ? "warning" : "none"}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Mes validations en attente</CardTitle>
              {myPendingApprovals.length > 0 && <Badge variant="destructive">{myPendingApprovals.length}</Badge>}
            </CardHeader>
            <CardContent>
              {myPendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rien à valider.</p>
              ) : (
                <ul className="space-y-2">
                  {myPendingApprovals.map((a) => (
                    <li key={a.id}>
                      <Link href={`/taches/${a.run.taskId}`} className={ROW_LINK}>
                        {a.run.task.titre}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card accent={myNotifications.some((n) => !n.isRead) ? "info" : "none"}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Mes notifications</CardTitle>
              {myNotifications.some((n) => !n.isRead) && <Badge>Nouveau</Badge>}
            </CardHeader>
            <CardContent>
              {myNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune notification.</p>
              ) : (
                <ul className="space-y-2">
                  {myNotifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.lien ?? "/notifications"}
                        className={cn(ROW_LINK, !n.isRead ? "font-medium" : "text-muted-foreground")}
                      >
                        {n.titre}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mes demandes</CardTitle>
            </CardHeader>
            <CardContent>
              {myAdminRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
              ) : (
                <ul className="space-y-2">
                  {myAdminRequests.map((r) => (
                    <li key={r.id}>
                      <Link href={`/demandes/${r.id}`} className={cn(ROW_LINK, "flex items-center justify-between")}>
                        <span className="font-medium">{r.titre}</span>
                        <Badge variant={toneForAdminRequestStatus(r.statut)}>
                          {ADMIN_REQUEST_STATUS_LABELS[r.statut]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/demandes" className="mt-2 block text-xs text-primary hover:underline">
                Voir toutes mes demandes
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardSection>

      <DashboardSection title="Cette semaine">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mes réunions</CardTitle>
            </CardHeader>
            <CardContent>
              {myMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune réunion à venir.</p>
              ) : (
                <ul className="space-y-2">
                  {myMeetings.map((m) => (
                    <li key={m.id}>
                      <Link href={`/reunions/${m.id}`} className={cn(ROW_LINK, "flex items-center justify-between")}>
                        <span className="font-medium">{m.titre}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.dateHeure.toLocaleDateString("fr-FR")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mon calendrier (14 jours)</CardTitle>
            </CardHeader>
            <CardContent>
              {myEvents.length === 0 && myLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rien de prévu.</p>
              ) : (
                <ul className="space-y-2">
                  {myEvents.map((e) => (
                    <li key={e.id} className={STATIC_ROW}>
                      <span>{e.titre}</span>
                      <span className="text-xs text-muted-foreground">{e.dateDebut.toLocaleDateString("fr-FR")}</span>
                    </li>
                  ))}
                  {myLeaves.map((l) => (
                    <li key={l.id} className={STATIC_ROW}>
                      <span>Congé</span>
                      <span className="text-xs text-muted-foreground">{l.dateDebut.toLocaleDateString("fr-FR")}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/calendrier" className="mt-2 block text-xs text-primary hover:underline">
                Voir le calendrier complet
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardSection>

      <DashboardSection title="Équipe & collaboration">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mes messages</CardTitle>
            </CardHeader>
            <CardContent>
              {myConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune conversation.</p>
              ) : (
                <ul className="space-y-2">
                  {myConversations.map((c) => {
                    const other = c.participants.find((p) => p.userId !== userId)?.user.name;
                    const lastMessage = c.messages[0];
                    return (
                      <li key={c.id}>
                        <Link href={`/messages/${c.id}`} className={ROW_LINK}>
                          <div className="font-medium">{c.nom || other || "Conversation"}</div>
                          {lastMessage && (
                            <div className="truncate text-xs text-muted-foreground">
                              {lastMessage.author.name}: {lastMessage.content || "Pièce jointe"}
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mes documents récents</CardTitle>
            </CardHeader>
            <CardContent>
              {myDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document ajouté récemment.</p>
              ) : (
                <ul className="space-y-2">
                  {myDocuments.map((d) => (
                    <li key={d.id}>
                      <Link href={`/documents/${d.id}`} className={ROW_LINK}>
                        {d.nom}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardSection>

      <DashboardSection title="Mes projets & objectifs">
        <div className="space-y-4">
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
                        className={cn(ROW_LINK, "flex items-center justify-between")}
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
                        <Link href={`/objectifs/${objective.id}`} className={ROW_LINK}>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activités récentes de l&apos;équipe</CardTitle>
            </CardHeader>
            <CardContent>
              {teamActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité récente sur vos projets.</p>
              ) : (
                <ul className="space-y-2">
                  {teamActivity.map((entry) => (
                    <li key={entry.id} className="flex items-baseline justify-between text-sm">
                      <span>
                        <span className="font-medium">{entry.user?.name ?? "Quelqu'un"}</span>{" "}
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.createdAt.toLocaleDateString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardSection>
    </div>
  );
}

function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">{title}</h2>
      {children}
    </section>
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
    <Card accent={highlight ? "destructive" : "info"}>
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
                <Link href={`/taches/${task.id}`} className={cn(ROW_LINK, "flex flex-col")}>
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
