import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { SectionCommentSection } from "@/components/projects/section-comment-section";
import { documentUploaderName } from "@/lib/document-uploader";

const TYPE_LABELS: Record<string, string> = {
  PHASE: "Phase",
  SOUS_PHASE: "Sous-phase",
  LOT: "Lot",
};

const STATUS_LABELS: Record<string, string> = {
  A_VENIR: "À venir",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  EN_RETARD: "En retard",
};

export default async function SectionDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
}) {
  const { projectId, sectionId } = await params;

  const section = await prisma.projectSection.findUnique({
    where: { id: sectionId },
    include: {
      project: true,
      responsable: true,
      documents: { include: { uploadedBy: true, uploadedByContact: true, _count: { select: { versions: true } } } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { tasks: true } },
    },
  });

  if (!section || section.projectId !== projectId) {
    notFound();
  }

  const documentRows: DocumentRow[] = section.documents.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    uploadedByName: documentUploaderName(d),
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: null,
    taskId: null,
    meetingTitre: null,
    meetingId: null,
    type: d.type,
    statutSignature: d.statutSignature,
    estArchive: d.estArchive,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{TYPE_LABELS[section.type]}</Badge>
            <h1 className="text-2xl font-semibold">{section.nom}</h1>
            <Badge variant={toneForStatus(section.statut)}>{STATUS_LABELS[section.statut]}</Badge>
          </div>
          <Link href={`/projets/${projectId}`} className="text-sm text-muted-foreground hover:underline">
            {section.project.nom}
          </Link>
        </div>

        {section.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{section.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commentaires</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionCommentSection
              sectionId={section.id}
              comments={section.comments.map((c) => ({
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
            <CardTitle className="text-base">Documents</CardTitle>
            <DocumentFormDialog projectId={projectId} sectionId={section.id} triggerLabel="Ajouter un document" />
          </CardHeader>
          <CardContent>
            <DocumentList documents={documentRows} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card accent={accentForStatus(section.statut)}>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Responsable" value={section.responsable?.name ?? "—"} />
            <Info
              label="Début"
              value={section.dateDebut ? new Date(section.dateDebut).toLocaleDateString("fr-FR") : "—"}
            />
            <Info
              label="Échéance"
              value={section.dateFin ? new Date(section.dateFin).toLocaleDateString("fr-FR") : "—"}
            />
            <Info label="Tâches" value={String(section._count.tasks)} />
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
