import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddVersionForm } from "@/components/documents/add-version-form";
import { DocumentAccessManager } from "@/components/documents/document-access-manager";
import { DocumentSignatureForm } from "@/components/documents/document-signature-form";
import { DocumentArchiveButton } from "@/components/documents/document-archive-button";
import { DocumentPartageExterneToggle } from "@/components/documents/document-partage-externe-toggle";
import { RequestExternalValidationButton } from "@/components/documents/request-external-validation-button";
import { documentUploaderName } from "@/lib/document-uploader";
import { getTagsFor } from "@/lib/tags";
import { EntityTagsEditor } from "@/components/tags/entity-tags-editor";
import { DeleteToTrashButton } from "@/components/trash/delete-to-trash-button";
import { TrashItemActions } from "@/components/trash/trash-item-actions";

const VALIDATION_LABELS: Record<string, string> = {
  NON_REQUISE: "Non requise",
  EN_ATTENTE: "En attente de validation client",
  VALIDE: "Validé par le client",
  REJETE: "Rejeté par le client",
};

const TYPE_LABELS: Record<string, string> = {
  CONTRAT: "Contrat",
  RAPPORT: "Rapport",
  FACTURE: "Facture",
  PROCES_VERBAL: "Procès-verbal",
  LIVRABLE: "Livrable",
  MODELE: "Modèle",
  AUTRE: "Autre",
};

function DocumentPreview({ url, mimeType, nom }: { url: string; mimeType: string | null; nom: string }) {
  if (mimeType === "application/pdf") {
    return <iframe src={url} title={nom} className="h-[70vh] w-full rounded-md border" />;
  }
  if (mimeType?.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nom} className="max-h-[70vh] w-full rounded-md border object-contain" />;
  }
  return (
    <p className="text-sm text-muted-foreground">
      Aperçu en ligne non disponible pour ce type de fichier — utilisez le lien ci-dessous pour le
      télécharger.
    </p>
  );
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const session = await getServerSession(authOptions);

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      project: true,
      folder: true,
      task: true,
      meeting: true,
      uploadedBy: true,
      uploadedByContact: true,
      archivedBy: true,
      versions: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
      accessGrants: { include: { user: true } },
    },
  });

  if (!document) {
    notFound();
  }

  // Controle d'acces par document (cahier des charges §10).
  const isRestricted = document.accessGrants.length > 0;
  const canAccess =
    !isRestricted ||
    document.uploadedById === session!.user.id ||
    document.accessGrants.some((g) => g.userId === session!.user.id);
  if (!canAccess) {
    notFound();
  }

  const canManageAccess = session!.user.permissions.includes(PERMISSIONS.DOCUMENT_UPDATE);
  const canDeleteDocument = session!.user.permissions.includes(PERMISSIONS.DOCUMENT_DELETE);
  const allUsers = canManageAccess
    ? await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    : [];
  const tags = await getTagsFor("Document", document.id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {document.deletedAt && (
          <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">Ce document a été supprimé et se trouve dans la corbeille.</p>
            {canDeleteDocument && <TrashItemActions entityType="Document" id={document.id} canPurge={false} />}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{document.nom}</h1>
            <Badge variant="secondary">{TYPE_LABELS[document.type]}</Badge>
            {canDeleteDocument && !document.deletedAt && <DeleteToTrashButton entityType="Document" id={document.id} />}
            {document.validationExterne !== "NON_REQUISE" && (
              <Badge
                variant={
                  document.validationExterne === "VALIDE"
                    ? "success"
                    : document.validationExterne === "REJETE"
                      ? "destructive"
                      : "warning"
                }
              >
                {VALIDATION_LABELS[document.validationExterne]}
              </Badge>
            )}
            {document.estArchive && <Badge variant="outline">Archivé</Badge>}
          </div>
          <Link href={`/projets/${document.projectId}`} className="text-sm text-muted-foreground hover:underline">
            {document.project.nom}
          </Link>
          {document.folder && (
            <span className="text-sm text-muted-foreground"> · {document.folder.nom}</span>
          )}
          <div className="mt-2">
            <EntityTagsEditor entityType="Document" entityId={document.id} initialTags={tags} canManage={canManageAccess} />
          </div>
        </div>

        {document.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{document.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aperçu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DocumentPreview url={document.url} mimeType={document.mimeType} nom={document.nom} />
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-primary hover:underline"
            >
              {document.url}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des modifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {document.versions.map((v, i) => (
                <li key={v.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant={i === 0 ? "secondary" : "outline"}>
                      {i === 0 ? "Version actuelle" : `Version ${document.versions.length - i}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {v.createdBy.name} · {new Date(v.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <a href={v.url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                    {v.url}
                  </a>
                  {v.note && <p className="mt-1 text-muted-foreground">{v.note}</p>}
                </li>
              ))}
            </ul>
            <AddVersionForm documentId={document.id} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Ajouté par" value={documentUploaderName(document)} />
            <Info label="Ajouté le" value={new Date(document.createdAt).toLocaleDateString("fr-FR")} />
            {document.task && (
              <div>
                <div className="text-xs text-muted-foreground">Tâche liée</div>
                <Link href={`/taches/${document.task.id}`} className="font-medium text-primary hover:underline">
                  {document.task.titre}
                </Link>
              </div>
            )}
            {document.meeting && (
              <div>
                <div className="text-xs text-muted-foreground">Réunion liée</div>
                <Link href={`/reunions/${document.meeting.id}`} className="font-medium text-primary hover:underline">
                  {document.meeting.titre}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {canManageAccess && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suivi documentaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.type === "CONTRAT" && (
                <DocumentSignatureForm
                  documentId={document.id}
                  initialStatut={document.statutSignature}
                  initialDateSignature={document.dateSignature ? document.dateSignature.toISOString().slice(0, 10) : null}
                />
              )}
              <div>
                {document.estArchive && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Archivé le {document.dateArchivage?.toLocaleDateString("fr-FR")}
                    {document.archivedBy && ` par ${document.archivedBy.name}`}
                  </p>
                )}
                <DocumentArchiveButton documentId={document.id} isArchived={document.estArchive} />
              </div>
              <div className="border-t pt-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Visibilité dans le portail externe (cahier des charges §19) — non partagé par défaut.
                </p>
                <DocumentPartageExterneToggle documentId={document.id} partageExterne={document.partageExterne} />
              </div>
              {document.task?.externalContactId && (
                <div className="space-y-1 border-t pt-3">
                  <div className="text-xs text-muted-foreground">Validation par le partenaire externe</div>
                  <p className="text-sm font-medium">{VALIDATION_LABELS[document.validationExterne]}</p>
                  {document.commentaireValidationExterne && (
                    <p className="text-sm text-muted-foreground">
                      « {document.commentaireValidationExterne} »
                    </p>
                  )}
                  {document.validationExterne === "NON_REQUISE" && (
                    <RequestExternalValidationButton documentId={document.id} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canManageAccess && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contrôle d&apos;accès</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentAccessManager
                documentId={document.id}
                users={allUsers.map((u) => ({ id: u.id, label: u.name }))}
                grantedUsers={document.accessGrants.map((g) => ({ id: g.user.id, label: g.user.name }))}
              />
            </CardContent>
          </Card>
        )}
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
