import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority, accentForStatus } from "@/lib/status-tone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checklist } from "@/components/tasks/checklist";
import { CommentSection } from "@/components/tasks/comment-section";
import { DependencySection } from "@/components/tasks/dependency-section";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { documentUploaderName } from "@/lib/document-uploader";
import { ActualTimeForm } from "@/components/tasks/actual-time-form";
import { ValidationActions } from "@/components/tasks/validation-actions";
import { TaskHistory } from "@/components/tasks/task-history";
import { LinkMissionForm } from "@/components/tasks/link-mission-form";
import { IndicatorList, type IndicatorData } from "@/components/objectives/indicator-list";
import { AddTaskIndicatorDialog } from "@/components/tasks/add-task-indicator-dialog";
import { getTagsFor } from "@/lib/tags";
import { EntityTagsEditor } from "@/components/tags/entity-tags-editor";

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { members: { include: { user: true } } } },
      section: true,
      responsablePrincipal: true,
      assignees: { include: { user: true } },
      checklistItems: { include: { responsable: true }, orderBy: { ordre: "asc" } },
      comments: {
        include: { author: true, reactions: { include: { user: true } } },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        include: { uploadedBy: true, uploadedByContact: true, meeting: true, _count: { select: { versions: true } } },
      },
      dependsOn: { include: { dependsOnTask: true } },
      externalContact: true,
      objective: true,
      plan: true,
      courrier: true,
      meetingDecision: { include: { meeting: true } },
      adminRequest: true,
      indicators: { orderBy: { createdAt: "asc" } },
      validationRun: {
        include: {
          workflow: { include: { steps: { orderBy: { ordre: "asc" } } } },
          approvals: { include: { approver: true, step: true } },
        },
      },
    },
  });

  if (!task) {
    notFound();
  }

  // Isolation multi-entites (cahier des charges V2.2 §22) — voir entity-scope.ts.
  const entityScope = await getUserEntityScope(session!.user.id, session!.user.permissions);
  const allowedDepartmentIds = await getAllowedDepartmentIds(entityScope);
  if (allowedDepartmentIds && !allowedDepartmentIds.includes(task.project.departmentId)) {
    notFound();
  }

  const canTag = session!.user.permissions.includes(PERMISSIONS.TASK_UPDATE);
  const tags = await getTagsFor("Task", task.id);

  const canAssign = session!.user.permissions.includes(PERMISSIONS.TASK_ASSIGN);

  const [otherTasks, historyEntries, externalCandidates, projectMembers] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: task.projectId, id: { not: task.id } },
      select: { id: true, titre: true },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "Task", entityId: task.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    canAssign
      ? prisma.crmContact.findMany({
          where: { type: { in: ["PARTENAIRE", "PRESTATAIRE", "CONSULTANT"] } },
          orderBy: { nom: "asc" },
          select: { id: true, prenom: true, nom: true, type: true },
        })
      : Promise.resolve([]),
    prisma.projectMember.findMany({
      where: { projectId: task.projectId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // Candidats @mention (src/lib/mentions.ts) : mêmes personnes que celles
  // notifiées côté serveur pour un commentaire — responsable, co-responsables,
  // membres du projet — dédupliquées.
  const mentionCandidates = Array.from(
    new Map(
      [
        { id: task.responsablePrincipalId, name: task.responsablePrincipal.name },
        ...task.assignees.map((a) => ({ id: a.userId, name: a.user.name })),
        ...task.project.members.map((m) => ({ id: m.userId, name: m.user.name })),
      ].map((c) => [c.id, c])
    ).values()
  );

  const checklistRows = task.checklistItems.map((item) => ({
    id: item.id,
    label: item.label,
    isDone: item.isDone,
    responsableId: item.responsableId,
    responsableName: item.responsable?.name ?? null,
    echeance: item.echeance ? item.echeance.toISOString() : null,
  }));

  const indicatorRows: IndicatorData[] = task.indicators.map((i) => ({
    id: i.id,
    nom: i.nom,
    unite: i.unite,
    valeurCible: Number(i.valeurCible),
    valeurActuelle: Number(i.valeurActuelle),
  }));

  const documentRows: DocumentRow[] = task.documents.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    uploadedByName: documentUploaderName(d),
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: null,
    taskId: null,
    meetingTitre: d.meeting?.titre ?? null,
    meetingId: d.meetingId,
    type: d.type,
    statutSignature: d.statutSignature,
    estArchive: d.estArchive,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{task.titre}</h1>
            <Badge variant={toneForStatus(task.statut)}>{STATUS_LABELS[task.statut]}</Badge>
            <Badge variant={toneForPriority(task.priorite)}>{PRIORITY_LABELS[task.priorite]}</Badge>
            {task.creeParWorkflow && <Badge variant="outline">Créée par workflow</Badge>}
          </div>
          <Link href={`/projets/${task.projectId}`} className="text-sm text-muted-foreground hover:underline">
            {task.project.nom}
            {task.section ? ` · ${task.section.nom}` : ""}
          </Link>
          <div className="mt-2">
            <EntityTagsEditor entityType="Task" entityId={task.id} initialTags={tags} canManage={canTag} />
          </div>
        </div>

        {task.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{task.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <Checklist
              taskId={task.id}
              items={checklistRows}
              members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">KPI</CardTitle>
            <AddTaskIndicatorDialog taskId={task.id} />
          </CardHeader>
          <CardContent>
            <IndicatorList indicators={indicatorRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commentaires</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentSection
              taskId={task.id}
              currentUserId={session!.user.id}
              candidates={mentionCandidates}
              comments={task.comments.map((c) => ({
                id: c.id,
                content: c.content,
                authorName: c.author.name,
                createdAt: c.createdAt.toISOString(),
                reactions: c.reactions.map((r) => ({
                  emoji: r.emoji,
                  userId: r.userId,
                  userName: r.user.name,
                })),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents liés</CardTitle>
            <DocumentFormDialog projectId={task.projectId} taskId={task.id} triggerLabel="Lier un document" />
          </CardHeader>
          <CardContent>
            <DocumentList documents={documentRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des modifications</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskHistory
              entries={historyEntries.map((h) => ({
                id: h.id,
                action: h.action,
                authorName: h.user?.name ?? null,
                createdAt: h.createdAt.toISOString(),
                changes: h.changes,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card accent={accentForStatus(task.statut)}>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Responsable principal" value={task.responsablePrincipal.name} />
            <Info
              label="Co-responsables"
              value={task.assignees.map((a) => a.user.name).join(", ") || "—"}
            />
            <Info
              label="Échéance"
              value={task.echeance ? new Date(task.echeance).toLocaleDateString("fr-FR") : "—"}
            />
            <Info
              label="Temps estimé"
              value={task.tempsEstimeHeures ? `${task.tempsEstimeHeures} h` : "—"}
            />
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Temps réel</div>
              <ActualTimeForm
                taskId={task.id}
                initialValue={task.tempsReelHeures !== null ? Number(task.tempsReelHeures) : null}
              />
            </div>
            <Info label="Avancement" value={`${task.avancement}%`} />
          </CardContent>
        </Card>

        {(task.objective || task.plan || task.courrier || task.meetingDecision || task.adminRequest) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Origine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {task.objective && (
                <Link href={`/objectifs/${task.objective.id}`} className="block text-primary hover:underline">
                  Objectif : {task.objective.titre}
                </Link>
              )}
              {task.plan && (
                <Link href={`/planification/${task.plan.id}`} className="block text-primary hover:underline">
                  Plan : {task.plan.nom}
                </Link>
              )}
              {task.courrier && (
                <Link href={`/courrier/${task.courrier.id}`} className="block text-primary hover:underline">
                  Courrier : {task.courrier.reference ?? task.courrier.objet}
                </Link>
              )}
              {task.meetingDecision?.meeting && (
                <Link
                  href={`/reunions/${task.meetingDecision.meetingId}`}
                  className="block text-primary hover:underline"
                >
                  Décision de réunion : {task.meetingDecision.meeting.titre}
                </Link>
              )}
              {task.meetingDecision && !task.meetingDecision.meeting && (
                <Link href={`/projets/${task.projectId}`} className="block text-primary hover:underline">
                  Décision de projet
                </Link>
              )}
              {task.adminRequest && (
                <Link href={`/demandes/${task.adminRequest.id}`} className="block text-primary hover:underline">
                  Demande administrative : {task.adminRequest.titre}
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <ValidationActions
              taskId={task.id}
              statut={task.statut}
              isResponsable={task.responsablePrincipalId === session!.user.id}
              hasValidatePermission={session!.user.permissions.includes(PERMISSIONS.TASK_VALIDATE)}
              isCurrentApprover={
                task.validationRun?.statut === "EN_COURS" &&
                task.validationRun.workflow.steps.find(
                  (s) => s.ordre === task.validationRun!.currentOrdre
                )?.approverRole === session!.user.roleKey
              }
              steps={
                task.validationRun?.workflow.steps.map((step) => {
                  const approval = task.validationRun!.approvals.find((a) => a.stepId === step.id);
                  return {
                    ordre: step.ordre,
                    label: step.label ?? step.approverRole,
                    statut: approval?.statut ?? "EN_ATTENTE",
                    approverName: approval?.approver?.name ?? null,
                    isCurrent: step.ordre === task.validationRun!.currentOrdre,
                  };
                }) ?? []
              }
            />
          </CardContent>
        </Card>

        {canAssign && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mission externe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.externalContact ? (
                <p className="text-sm">
                  Déléguée à{" "}
                  <Link href={`/crm/contacts/${task.externalContact.id}`} className="text-primary hover:underline">
                    {task.externalContact.prenom} {task.externalContact.nom}
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Non déléguée. La déléguer la rend visible dans le portail externe du contact.
                </p>
              )}
              <LinkMissionForm
                taskId={task.id}
                candidates={externalCandidates.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }))}
                hasMission={!!task.externalContact}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dépendances</CardTitle>
          </CardHeader>
          <CardContent>
            <DependencySection
              taskId={task.id}
              dependencies={task.dependsOn.map((d) => ({
                id: d.dependsOnTask.id,
                titre: d.dependsOnTask.titre,
              }))}
              otherTasks={otherTasks}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
