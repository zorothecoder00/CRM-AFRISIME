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
  const allUsers = canManageAccess
    ? await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-semibold">{document.nom}</h1>
          <Link href={`/projets/${document.projectId}`} className="text-sm text-muted-foreground hover:underline">
            {document.project.nom}
          </Link>
          {document.folder && (
            <span className="text-sm text-muted-foreground"> · {document.folder.nom}</span>
          )}
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
            <Info label="Ajouté par" value={document.uploadedBy.name} />
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
