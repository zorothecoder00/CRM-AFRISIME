import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderTree, type FolderNode } from "@/components/documents/folder-tree";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";

function buildFolderTree(
  folders: { id: string; nom: string; parentId: string | null; _count: { documents: number } }[]
): FolderNode[] {
  const nodeById = new Map<string, FolderNode>();
  for (const f of folders) {
    nodeById.set(f.id, { id: f.id, nom: f.nom, documentCount: f._count.documents, children: [] });
  }
  const roots: FolderNode[] = [];
  for (const f of folders) {
    const node = nodeById.get(f.id)!;
    if (f.parentId && nodeById.has(f.parentId)) {
      nodeById.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ projetId?: string; folderId?: string; q?: string }>;
}) {
  const { projetId, folderId, q } = await searchParams;

  const projects = await prisma.project.findMany({ orderBy: { nom: "asc" } });

  // Recherche globale : ignore le dossier courant, peut être limitée à un projet
  if (q) {
    const documents = await prisma.document.findMany({
      where: {
        nom: { contains: q, mode: "insensitive" },
        projectId: projetId || undefined,
      },
      include: {
        project: true,
        uploadedBy: true,
        task: true,
        meeting: true,
        _count: { select: { versions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows: DocumentRow[] = documents.map((d) => ({
      id: d.id,
      nom: d.nom,
      description: d.description,
      projectNom: d.project.nom,
      uploadedByName: d.uploadedBy.name,
      createdAt: d.createdAt.toISOString(),
      versionCount: d._count.versions,
      taskTitre: d.task?.titre ?? null,
      taskId: d.taskId,
      meetingTitre: d.meeting?.titre ?? null,
      meetingId: d.meetingId,
    }));

    return (
      <div className="space-y-6">
        <DocumentsHeader projects={projects} activeProjectId={projetId} query={q} />
        <p className="text-sm text-muted-foreground">
          {rows.length} résultat(s) pour « {q} »
        </p>
        <DocumentList documents={rows} />
      </div>
    );
  }

  if (!projetId) {
    return (
      <div className="space-y-6">
        <DocumentsHeader projects={projects} query={q} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/documents?projetId=${p.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{p.nom}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Ouvrir l&apos;espace documentaire
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const [folders, documents] = await Promise.all([
    prisma.documentFolder.findMany({
      where: { projectId: projetId },
      include: { _count: { select: { documents: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.document.findMany({
      where: { projectId: projetId, folderId: folderId || null },
      include: { uploadedBy: true, task: true, meeting: true, _count: { select: { versions: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tree = buildFolderTree(folders);
  const folderOptions = folders.map((f) => ({ id: f.id, label: f.nom }));

  const rows: DocumentRow[] = documents.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    uploadedByName: d.uploadedBy.name,
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: d.task?.titre ?? null,
    taskId: d.taskId,
    meetingTitre: d.meeting?.titre ?? null,
    meetingId: d.meetingId,
  }));

  return (
    <div className="space-y-6">
      <DocumentsHeader projects={projects} activeProjectId={projetId} query={q} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dossiers</CardTitle>
            <FolderFormDialog projectId={projetId} triggerLabel="Nouveau" />
          </CardHeader>
          <CardContent>
            <Link
              href={`/documents?projetId=${projetId}`}
              className={`mb-2 block text-sm ${!folderId ? "font-semibold" : "hover:underline"}`}
            >
              Racine
            </Link>
            <FolderTree
              nodes={tree}
              projectId={projetId}
              activeFolderId={folderId}
              buildHref={(id) => `/documents?projetId=${projetId}${id ? `&folderId=${id}` : ""}`}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents</CardTitle>
            <DocumentFormDialog projectId={projetId} folders={folderOptions} currentFolderId={folderId} />
          </CardHeader>
          <CardContent>
            <DocumentList documents={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DocumentsHeader({
  projects,
  activeProjectId,
  query,
}: {
  projects: { id: string; nom: string }[];
  activeProjectId?: string;
  query?: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Espace documentaire par projet : classement par dossiers, recherche, historique des versions.
        </p>
      </div>
      <form className="flex flex-wrap gap-2" action="/documents">
        {activeProjectId && <input type="hidden" name="projetId" value={activeProjectId} />}
        <Input
          name="q"
          placeholder="Rechercher un document..."
          defaultValue={query}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
        {(activeProjectId || query) && (
          <Link href="/documents">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/documents?projetId=${p.id}`}
              className={`rounded-full border px-3 py-1 ${
                activeProjectId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {p.nom}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
