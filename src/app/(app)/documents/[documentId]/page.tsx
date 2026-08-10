import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddVersionForm } from "@/components/documents/add-version-form";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      project: true,
      folder: true,
      task: true,
      meeting: true,
      uploadedBy: true,
      versions: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!document) {
    notFound();
  }

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
            <CardTitle className="text-base">Version actuelle</CardTitle>
          </CardHeader>
          <CardContent>
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
