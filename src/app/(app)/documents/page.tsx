import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import type { Prisma, DocumentType } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderTree, type FolderNode } from "@/components/documents/folder-tree";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { MATERIAL_TONES } from "@/lib/card-tones";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { documentUploaderName } from "@/lib/document-uploader";

// Demande utilisateur — fond Material ambre (teinte "chemise cartonnee", qui
// evoque la gestion documentaire) sur les cartes projet et document ; hover:bg-card
// garde la teinte au survol (sinon remplacee par bg-muted/50), assombrie.
const DOCUMENT_CARD_TONE = `${MATERIAL_TONES[2]} hover:bg-card hover:brightness-95`;

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
    libres?: string;
    departementId?: string;
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
  const { projetId, libres, departementId, folderId, q, uploadedById, type, docType, archives, dateFrom, dateTo } = await searchParams;
  const showArchives = archives === "1";
  // Demande utilisateur — documents deposes sans projet ("documents libres").
  const showLibres = libres === "1" && !projetId;

  const session = await getAppSession();
  const [projects, users, libresCount, departments, me] = await Promise.all([
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.document.count({ where: { projectId: null, estArchive: false, deletedAt: null } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { departmentId: true } }),
  ]);
  const projectOptions = projects.map((p) => ({ id: p.id, label: p.nom }));
  // Demande utilisateur — documents envoyes a un departement.
  const departmentOptions = departments.map((d) => ({ id: d.id, label: d.name }));
  const myDepartmentId = me?.departmentId ?? undefined;

  const hasAdvancedFilters = !!uploadedById || !!type || !!docType || !!dateFrom || !!dateTo || !!departementId;

  // Recherche globale : ignore le dossier courant, peut être limitée à un projet
  if (q || hasAdvancedFilters || showArchives) {
    const where: Prisma.DocumentWhereInput = {
      projectId: showLibres ? null : projetId || undefined,
      uploadedById: uploadedById || undefined,
      departmentId: departementId || undefined,
      mimeType: type && MIME_GROUPS[type] ? { in: MIME_GROUPS[type] } : undefined,
      type: docType && DOC_TYPE_LABELS[docType] ? (docType as DocumentType) : undefined,
      estArchive: showArchives ? undefined : false,
      // Corbeille (V2.2 §37) : un document supprime n'apparait jamais ici,
      // meme avec "afficher les archives" active — deletion l'emporte.
      deletedAt: null,
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
      projectNom: d.project?.nom ?? "Document libre",
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
          libres={showLibres}
          libresCount={libresCount}
          departments={departmentOptions}
          departementId={departementId}
          query={q}
          uploadedById={uploadedById}
          type={type}
          docType={docType}
          archives={showArchives}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{rows.length} résultat(s)</p>
          <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} active={!!myDepartmentId && departementId === myDepartmentId} />
        </div>
        <DocumentList documents={rows} cardClassName={DOCUMENT_CARD_TONE} />
      </div>
    );
  }

  if (showLibres) {
    const documents = await prisma.document.findMany({
      where: { projectId: null, estArchive: false, deletedAt: null },
      include: {
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
        <DocumentsHeader projects={projects} users={users} libres libresCount={libresCount} departments={departmentOptions} query={q} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents libres</CardTitle>
            <div className="flex gap-2">
              <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} />
              <DocumentFormDialog projects={projectOptions} departments={departmentOptions} />
            </div>
          </CardHeader>
          <CardContent>
            <DocumentList documents={rows} cardClassName={DOCUMENT_CARD_TONE} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projetId) {
    return (
      <div className="space-y-6">
        <DocumentsHeader projects={projects} users={users} libresCount={libresCount} departments={departmentOptions} query={q} hideSpaceChips />
        <div className="flex justify-end gap-2">
          <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} />
          <DocumentFormDialog projects={projectOptions} departments={departmentOptions} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/documents?libres=1">
            <Card className={cn("h-full transition-all hover:-translate-y-0.5", DOCUMENT_CARD_TONE)}>
              <CardHeader>
                <CardTitle className="text-base">Documents libres</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {libresCount} document(s) sans projet
              </CardContent>
            </Card>
          </Link>
          {projects.map((p) => (
            <Link key={p.id} href={`/documents?projetId=${p.id}`}>
              <Card
                className={cn("h-full transition-all hover:-translate-y-0.5", DOCUMENT_CARD_TONE)}
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
      where: { projectId: projetId, folderId: folderId || null, estArchive: false, deletedAt: null },
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
      <DocumentsHeader projects={projects} users={users} activeProjectId={projetId} libresCount={libresCount} departments={departmentOptions} query={q} />

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
            <div className="flex gap-2">
              <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} />
              <DocumentFormDialog projectId={projetId} departments={departmentOptions} folders={folderOptions} currentFolderId={folderId} />
            </div>
          </CardHeader>
          <CardContent>
            <DocumentList documents={rows} cardClassName={DOCUMENT_CARD_TONE} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Demande utilisateur — raccourci de navigation (pas un filtre) place a cote
// de "+ Nouveau document", en Material Green : Green 100 au repos, Green 700
// quand la vue "documents de mon departement" est deja ouverte.
function MyDepartmentDocumentsLink({ myDepartmentId, active }: { myDepartmentId?: string; active?: boolean }) {
  if (!myDepartmentId) return null;
  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className={
        active
          ? "border-[#388E3C] bg-[#388E3C] text-white hover:bg-[#2E7D32] hover:text-white"
          : "border-[#A5D6A7] bg-[#C8E6C9] text-[#1B5E20] hover:bg-[#A5D6A7] hover:text-[#1B5E20] dark:border-[#2E7D32] dark:bg-[color-mix(in_oklch,oklch(0.205_0_0),#1B5E20_40%)] dark:text-[#C8E6C9] dark:hover:bg-[color-mix(in_oklch,oklch(0.205_0_0),#1B5E20_60%)]"
      }
    >
      <Link href={`/documents?departementId=${myDepartmentId}`}>
        <Building2 className="mr-1 h-4 w-4" />
        Documents de mon département
      </Link>
    </Button>
  );
}

function DocumentsHeader({
  projects,
  users,
  activeProjectId,
  libres,
  libresCount = 0,
  departments = [],
  departementId,
  query,
  uploadedById,
  type,
  docType,
  archives,
  dateFrom,
  dateTo,
  hideSpaceChips,
}: {
  projects: { id: string; nom: string }[];
  users: { id: string; name: string }[];
  activeProjectId?: string;
  libres?: boolean;
  libresCount?: number;
  departments?: { id: string; label: string }[];
  departementId?: string;
  query?: string;
  uploadedById?: string;
  type?: string;
  docType?: string;
  archives?: boolean;
  dateFrom?: string;
  dateTo?: string;
  // Demande utilisateur — sur l'accueil, les cartes listent deja "Documents
  // libres" et chaque projet : les pastilles ne serviraient qu'a doublonner.
  // Elles restent utiles a l'interieur d'un espace pour passer a un autre.
  hideSpaceChips?: boolean;
}) {
  const hasFilters = activeProjectId || libres || departementId || query || uploadedById || type || docType || archives || dateFrom || dateTo;
  const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Espace documentaire : documents par projet (classés par dossiers) ou documents libres, recherche, historique des versions.
        </p>
      </div>
      <form className="flex flex-wrap items-center gap-2" action="/documents">
        {activeProjectId && <input type="hidden" name="projetId" value={activeProjectId} />}
        {libres && <input type="hidden" name="libres" value="1" />}
        <Input
          name="q"
          placeholder="Rechercher un document..."
          defaultValue={query}
          className="max-w-sm"
        />
        <select name="type" defaultValue={type ?? ""} className={selectClass}>
          <option value="">Tous formats</option>
          {Object.entries(MIME_GROUP_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="uploadedById" defaultValue={uploadedById ?? ""} className={selectClass}>
          <option value="">Déposé par : tout le monde</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select name="docType" defaultValue={docType ?? ""} className={selectClass}>
          <option value="">Toutes catégories</option>
          {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {departments.length > 0 && (
          <select name="departementId" defaultValue={departementId ?? ""} className={selectClass}>
            <option value="">Tous les départements</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        )}
        {/* Demande utilisateur — sans libelle, les deux champs date
            ressemblaient a un meme filtre affiche deux fois. */}
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Déposé du
          <input type="date" name="dateFrom" defaultValue={dateFrom} className={selectClass} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          au
          <input type="date" name="dateTo" defaultValue={dateTo} className={selectClass} />
        </label>
        <label className="flex h-9 items-center gap-1.5 rounded-md border border-input px-2 text-sm text-muted-foreground">
          <input type="checkbox" name="archives" value="1" defaultChecked={archives} className="h-3.5 w-3.5" />
          Afficher les archives
        </label>
        <Button type="submit" variant="outline">
          Appliquer les filtres
        </Button>
        {hasFilters && (
          <Link href="/documents">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>
      {!hideSpaceChips && (projects.length > 0 || libresCount > 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/documents?libres=1"
            className={`rounded-full border px-3 py-1 ${libres ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Documents libres ({libresCount})
          </Link>
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
