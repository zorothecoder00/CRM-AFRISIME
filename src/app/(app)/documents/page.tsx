import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, DocumentType } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderTree, type FolderNode } from "@/components/documents/folder-tree";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { accentForStatus } from "@/lib/status-tone";
import { documentUploaderName } from "@/lib/document-uploader";

const MIME_GROUPS: Record<string, string[]> = {
  pdf: ["application/pdf"],
  image: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
  word: [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  excel: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};
const MIME_GROUP_LABELS: Record<string, string> = {
  pdf: "PDF",
  image: "Image",
  word: "Word",
  excel: "Excel",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRAT: "Contrat",
  RAPPORT: "Rapport",
  FACTURE: "Facture",
  PROCES_VERBAL: "Procès-verbal",
  LIVRABLE: "Livrable",
  MODELE: "Modèle",
  AUTRE: "Autre",
};

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
  searchParams: Promise<{
    projetId?: string;
    folderId?: string;
    q?: string;
    uploadedById?: string;
    type?: string;
    docType?: string;
    archives?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const { projetId, folderId, q, uploadedById, type, docType, archives, dateFrom, dateTo } = await searchParams;
  const showArchives = archives === "1";

  const [projects, users] = await Promise.all([
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const hasAdvancedFilters = !!uploadedById || !!type || !!docType || !!dateFrom || !!dateTo;

  // Recherche globale : ignore le dossier courant, peut être limitée à un projet
  if (q || hasAdvancedFilters || showArchives) {
    const where: Prisma.DocumentWhereInput = {
      projectId: projetId || undefined,
      uploadedById: uploadedById || undefined,
      mimeType: type && MIME_GROUPS[type] ? { in: MIME_GROUPS[type] } : undefined,
      type: docType && DOC_TYPE_LABELS[docType] ? (docType as DocumentType) : undefined,
      estArchive: showArchives ? undefined : false,
    };
    if (q) where.nom = { contains: q, mode: "insensitive" };
    if (dateFrom || dateTo) {
      where.createdAt = {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined,
      };
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        project: true,
        uploadedBy: true,
        uploadedByContact: true,
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
      uploadedByName: documentUploaderName(d),
      createdAt: d.createdAt.toISOString(),
      versionCount: d._count.versions,
      taskTitre: d.task?.titre ?? null,
      taskId: d.taskId,
      meetingTitre: d.meeting?.titre ?? null,
      meetingId: d.meetingId,
      type: d.type,
      statutSignature: d.statutSignature,
      estArchive: d.estArchive,
    }));

    return (
      <div className="space-y-6">
        <DocumentsHeader
          projects={projects}
          users={users}
          activeProjectId={projetId}
          query={q}
          uploadedById={uploadedById}
          type={type}
          docType={docType}
          archives={showArchives}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
        <p className="text-sm text-muted-foreground">{rows.length} résultat(s)</p>
        <DocumentList documents={rows} />
      </div>
    );
  }

  if (!projetId) {
    return (
      <div className="space-y-6">
        <DocumentsHeader projects={projects} users={users} query={q} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/documents?projetId=${p.id}`}>
              <Card
                accent={accentForStatus(p.statut)}
                className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
              >
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
      where: { projectId: projetId, folderId: folderId || null, estArchive: false },
      include: {
        uploadedBy: true,
        uploadedByContact: true,
        task: true,
        meeting: true,
        _count: { select: { versions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tree = buildFolderTree(folders);
  const folderOptions = folders.map((f) => ({ id: f.id, label: f.nom }));

  const rows: DocumentRow[] = documents.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    uploadedByName: documentUploaderName(d),
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: d.task?.titre ?? null,
    taskId: d.taskId,
    meetingTitre: d.meeting?.titre ?? null,
    meetingId: d.meetingId,
    type: d.type,
    statutSignature: d.statutSignature,
    estArchive: d.estArchive,
  }));

  return (
    <div className="space-y-6">
      <DocumentsHeader projects={projects} users={users} activeProjectId={projetId} query={q} />

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
  users,
  activeProjectId,
  query,
  uploadedById,
  type,
  docType,
  archives,
  dateFrom,
  dateTo,
}: {
  projects: { id: string; nom: string }[];
  users: { id: string; name: string }[];
  activeProjectId?: string;
  query?: string;
  uploadedById?: string;
  type?: string;
  docType?: string;
  archives?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  const hasFilters = activeProjectId || query || uploadedById || type || docType || archives || dateFrom || dateTo;
  const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Espace documentaire par projet : classement par dossiers, recherche, historique des versions.
        </p>
      </div>
      <form className="flex flex-wrap items-center gap-2" action="/documents">
        {activeProjectId && <input type="hidden" name="projetId" value={activeProjectId} />}
        <Input
          name="q"
          placeholder="Rechercher un document..."
          defaultValue={query}
          className="max-w-sm"
        />
        <select name="type" defaultValue={type ?? ""} className={selectClass}>
          <option value="">Tous types</option>
          {Object.entries(MIME_GROUP_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="uploadedById" defaultValue={uploadedById ?? ""} className={selectClass}>
          <option value="">Tout le monde</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select name="docType" defaultValue={docType ?? ""} className={selectClass}>
          <option value="">Tous les types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input type="date" name="dateFrom" defaultValue={dateFrom} className={selectClass} />
        <input type="date" name="dateTo" defaultValue={dateTo} className={selectClass} />
        <label className="flex h-9 items-center gap-1.5 rounded-md border border-input px-2 text-sm text-muted-foreground">
          <input type="checkbox" name="archives" value="1" defaultChecked={archives} className="h-3.5 w-3.5" />
          Afficher les archives
        </label>
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
        {hasFilters && (
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
