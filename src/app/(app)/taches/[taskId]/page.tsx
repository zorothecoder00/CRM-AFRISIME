import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checklist } from "@/components/tasks/checklist";
import { CommentSection } from "@/components/tasks/comment-section";
import { DependencySection } from "@/components/tasks/dependency-section";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { ActualTimeForm } from "@/components/tasks/actual-time-form";

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

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      section: true,
      responsablePrincipal: true,
      assignees: { include: { user: true } },
      checklistItems: { orderBy: { ordre: "asc" } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      documents: { include: { uploadedBy: true, meeting: true, _count: { select: { versions: true } } } },
      dependsOn: { include: { dependsOnTask: true } },
    },
  });

  if (!task) {
    notFound();
  }

  const otherTasks = await prisma.task.findMany({
    where: { projectId: task.projectId, id: { not: task.id } },
    select: { id: true, titre: true },
  });

  const documentRows: DocumentRow[] = task.documents.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    uploadedByName: d.uploadedBy.name,
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: null,
    taskId: null,
    meetingTitre: d.meeting?.titre ?? null,
    meetingId: d.meetingId,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{task.titre}</h1>
            <Badge variant="secondary">{STATUS_LABELS[task.statut]}</Badge>
            <Badge variant="outline">{PRIORITY_LABELS[task.priorite]}</Badge>
          </div>
          <Link href={`/projets/${task.projectId}`} className="text-sm text-muted-foreground hover:underline">
            {task.project.nom}
            {task.section ? ` · ${task.section.nom}` : ""}
          </Link>
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
            <Checklist taskId={task.id} items={task.checklistItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commentaires</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentSection
              taskId={task.id}
              comments={task.comments.map((c) => ({
                id: c.id,
                content: c.content,
                authorName: c.author.name,
                createdAt: c.createdAt.toISOString(),
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
      </div>

      <div className="space-y-6">
        <Card>
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
