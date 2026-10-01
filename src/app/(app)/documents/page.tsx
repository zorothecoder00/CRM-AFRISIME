import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import type { Prisma, DocumentType } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderBrowser, FolderTile } from "@/components/documents/folder-browser";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { MATERIAL_TONES } from "@/lib/card-tones";
import { Building2, FileText, Folder, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { documentUploaderName } from "@/lib/document-uploader";
import { folderPathOptions } from "@/lib/document-folders";

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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    projetId?: string;
    libres?: string;
    departementId?: string;
    folderId?: string;
    nonClasses?: string;
    vue?: string;
    q?: string;
    uploadedById?: string;
    type?: string;
    docType?: string;
    archives?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const { projetId, libres, departementId, folderId, nonClasses, vue, q, uploadedById, type, docType, archives, dateFrom, dateTo } = await searchParams;
  const showArchives = archives === "1";
  // Demande utilisateur — documents deposes sans projet ("documents libres").
  const showLibres = libres === "1" && !projetId;

  const session = await getAppSession();
  const canManageFolders = session!.user.permissions.includes(PERMISSIONS.DOCUMENT_MANAGE_FOLDERS);
  const canMoveDocuments = session!.user.permissions.includes(PERMISSIONS.DOCUMENT_UPDATE);
  const [projects, users, departments, me] = await Promise.all([
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { departmentId: true } }),
  ]);
  const projectOptions = projects.map((p) => ({ id: p.id, label: p.nom }));
  // Demande utilisateur — documents envoyes a un departement.
  const departmentOptions = departments.map((d) => ({ id: d.id, label: d.name }));
  const myDepartmentId = me?.departmentId ?? undefined;

  const hasAdvancedFilters = !!uploadedById || !!type || !!docType || !!dateFrom || !!dateTo || !!departementId;

  // Recherche globale : ignore le dossier courant, peut être limitée à un projet
  // Vue "Documents" (bascule en haut de page) : tous les documents a plat,
  // avec les filtres — l'autre vue, "Dossiers", est la navigation par
  // dossiers. Une recherche ou un filtre y mene aussi.
  const isFiltering = !!q || hasAdvancedFilters || showArchives;
  if (vue === "documents" && !isFiltering && !showLibres && !projetId) {
    const [libresCount, projectCounts] = await Promise.all([
      prisma.document.count({ where: { projectId: null, estArchive: false, deletedAt: null } }),
      prisma.document.groupBy({
        by: ["projectId"],
        where: { projectId: { not: null }, estArchive: false, deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const projectCount = (id: string) => projectCounts.find((c) => c.projectId === id)?._count._all ?? 0;

    return (
      <div className="space-y-6">
        <DocumentsHeader showFilters users={users} departments={departmentOptions} query={q} />
        <div className="flex flex-wrap justify-end gap-2">
          <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} />
          <DocumentFormDialog projects={projectOptions} departments={departmentOptions} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/documents?vue=documents&libres=1">
            <Card className={cn("h-full transition-all hover:-translate-y-0.5", DOCUMENT_CARD_TONE)}>
              <CardHeader>
                <CardTitle className="text-base">Documents libres</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{libresCount} document(s) sans projet</CardContent>
            </Card>
          </Link>
          {projects.map((p) => (
            <Link key={p.id} href={`/documents?vue=documents&projetId=${p.id}`}>
              <Card className={cn("h-full transition-all hover:-translate-y-0.5", DOCUMENT_CARD_TONE)}>
                <CardHeader>
                  <CardTitle className="text-base">{p.nom}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{projectCount(p.id)} document(s)</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Vue Documents d'un espace (tous ses documents, quel que soit leur
  // dossier) ou resultats d'une recherche / de filtres.
  if (vue === "documents" || isFiltering) {
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
          showFilters
          users={users}
          activeProjectId={projetId}
          libres={showLibres}
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
        {showLibres || projetId ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <Link href="/documents?vue=documents" className="text-xs text-muted-foreground hover:underline">
                  ← Tous les espaces
                </Link>
                <CardTitle className="text-base">
                  {showLibres ? "Documents libres" : (projects.find((p) => p.id === projetId)?.nom ?? "Projet")}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{rows.length} document(s)</span>
                </CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} />
                <DocumentFormDialog
                  projectId={projetId}
                  projects={showLibres ? undefined : projectOptions}
                  departments={departmentOptions}
                />
              </div>
            </CardHeader>
            <CardContent>
              <DocumentList documents={rows} cardClassName={DOCUMENT_CARD_TONE} />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{rows.length} document(s)</p>
              <div className="flex flex-wrap gap-2">
                <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} active={!!myDepartmentId && departementId === myDepartmentId} />
                <DocumentFormDialog projects={projectOptions} departments={departmentOptions} />
              </div>
            </div>
            <DocumentList documents={rows} cardClassName={DOCUMENT_CARD_TONE} />
          </>
        )}
      </div>
    );
  }

  // Demande utilisateur (2026-10-01) — les dossiers servent a masquer les
  // documents, qui deviennent vite trop nombreux : un espace (documents
  // libres ou un projet) n'affiche a sa racine QUE ses dossiers (et une
  // tuile "Non classés" pour les documents rangés nulle part) ; les
  // documents ne s'affichent qu'une fois un dossier (ou "Non classés") ouvert.
  const docRowsInclude = {
    uploadedBy: true,
    uploadedByContact: true,
    task: true,
    meeting: true,
    _count: { select: { versions: true } },
  } as const;
  const liveDocs = { estArchive: false, deletedAt: null };
  const toRow = (d: Prisma.DocumentGetPayload<{ include: typeof docRowsInclude }>): DocumentRow => ({
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
    folderId: d.folderId,
  });
  const loadSpaceFolders = async (projectId: string | null) => {
    const folders = await prisma.documentFolder.findMany({
      where: { projectId },
      include: { _count: { select: { documents: { where: liveDocs } } } },
      orderBy: { nom: "asc" },
    });
    return folders.map((f) => ({ id: f.id, nom: f.nom, parentId: f.parentId, documentCount: f._count.documents }));
  };

  if (projetId || (showLibres && (folderId || nonClasses === "1"))) {
    const spaceProjectId = projetId ?? null;
    const showUnfiled = nonClasses === "1" && !folderId;
    const showDocuments = !!folderId || showUnfiled;
    const [folders, documents, unfiledCount] = await Promise.all([
      loadSpaceFolders(spaceProjectId),
      showDocuments
        ? prisma.document.findMany({
            where: { projectId: spaceProjectId, folderId: folderId || null, ...liveDocs },
            include: docRowsInclude,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      prisma.document.count({ where: { projectId: spaceProjectId, folderId: null, ...liveDocs } }),
    ]);
    const rows = documents.map(toRow);
    const folderOptions = folderPathOptions(folders);
    const activeFolder = folderId ? folders.find((f) => f.id === folderId) : undefined;
    const projectName = projects.find((p) => p.id === projetId)?.nom ?? "Projet";
    const baseHref = projetId ? `/documents?projetId=${projetId}` : "/documents?libres=1";
    const crumbs = projetId
      ? [
          { label: "Documents", href: "/documents" },
          { label: projectName, href: baseHref },
        ]
      : [{ label: "Documents libres", href: "/documents" }];
    const title = activeFolder ? activeFolder.nom : showUnfiled ? "Non classés" : projetId ? projectName : "Documents libres";

    return (
      <div className="space-y-6">
        <DocumentsHeader
          users={users}
          activeProjectId={projetId}
          libres={!projetId}
          departments={departmentOptions}
          query={q}
        />

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} />
              {canManageFolders && !showUnfiled && (
                <FolderFormDialog
                  projectId={spaceProjectId ?? undefined}
                  parentId={folderId}
                  triggerLabel={folderId ? "Nouveau sous-dossier" : "Nouveau dossier"}
                />
              )}
              {/* Sans choix de projet : un document ajoute dans un espace
                  appartient a cet espace, dans le dossier ouvert. */}
              <DocumentFormDialog
                projectId={spaceProjectId ?? undefined}
                departments={departmentOptions}
                folders={folderOptions}
                currentFolderId={folderId}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FolderBrowser
              folders={showUnfiled ? [] : folders}
              currentFolderId={folderId}
              crumbs={crumbs}
              extraCrumb={showUnfiled ? "Non classés" : undefined}
              buildHref={(id) => `${baseHref}&folderId=${id}`}
              canManage={canManageFolders}
              unfiled={{ href: `${baseHref}&nonClasses=1`, count: unfiledCount }}
              tileClassName={DOCUMENT_CARD_TONE}
            />
            {showDocuments ? (
              <DocumentList
                documents={rows}
                cardClassName={DOCUMENT_CARD_TONE}
                moveFolders={canMoveDocuments ? folderOptions : undefined}
                canCreateFolder={canManageFolders}
              />
            ) : (
              folders.length === 0 &&
              unfiledCount === 0 && <p className="text-sm text-muted-foreground">Aucun dossier ni document pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accueil : les dossiers directement, en deux sections — dossiers libres
  // (+ "Non classés"), puis un dossier par projet.
  const [freeFolders, freeUnfiledCount, folderCounts, documentCounts] = await Promise.all([
    loadSpaceFolders(null),
    prisma.document.count({ where: { projectId: null, folderId: null, ...liveDocs } }),
    prisma.documentFolder.groupBy({ by: ["projectId"], where: { projectId: { not: null } }, _count: { _all: true } }),
    prisma.document.groupBy({ by: ["projectId"], where: { projectId: { not: null }, ...liveDocs }, _count: { _all: true } }),
  ]);
  const projectSummary = (projectId: string) => {
    const nbFolders = folderCounts.find((c) => c.projectId === projectId)?._count._all ?? 0;
    const nbDocuments = documentCounts.find((c) => c.projectId === projectId)?._count._all ?? 0;
    return `${nbFolders} dossier(s) · ${nbDocuments} document(s)`;
  };

  return (
    <div className="space-y-6">
      <DocumentsHeader users={users} departments={departmentOptions} query={q} />
      {/* Demande utilisateur — les trois actions sur une meme ligne. */}
      <div className="flex flex-wrap justify-end gap-2">
        <MyDepartmentDocumentsLink myDepartmentId={myDepartmentId} />
        {canManageFolders && <FolderFormDialog triggerLabel="Nouveau dossier" />}
        <DocumentFormDialog projects={projectOptions} departments={departmentOptions} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dossiers libres</h2>
        {freeFolders.length === 0 && freeUnfiledCount === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun dossier libre pour le moment.</p>
        ) : (
          <FolderBrowser
            folders={freeFolders}
            buildHref={(id) => `/documents?libres=1&folderId=${id}`}
            canManage={canManageFolders}
            unfiled={{ href: "/documents?libres=1&nonClasses=1", count: freeUnfiledCount }}
            tileClassName={DOCUMENT_CARD_TONE}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dossiers de projets</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun projet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <FolderTile
                  href={`/documents?projetId=${p.id}`}
                  label={p.nom}
                  detail={projectSummary(p.id)}
                  className={DOCUMENT_CARD_TONE}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
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

/**
 * Bascule entre les deux facons de parcourir /documents (demande
 * utilisateur 2026-10-01) : par dossiers (les documents restent caches
 * dans leurs dossiers) ou par documents (liste complete + filtres).
 */
function ViewToggle({ active }: { active: "dossiers" | "documents" }) {
  const item = (key: "dossiers" | "documents", href: string, label: string, Icon: typeof Folder) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
        active === key ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
  return (
    <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Mode d'affichage">
      {item("dossiers", "/documents", "Dossiers", Folder)}
      {item("documents", "/documents?vue=documents", "Documents", FileText)}
    </div>
  );
}

function DocumentsHeader({
  users,
  activeProjectId,
  libres,
  departments = [],
  departementId,
  query,
  uploadedById,
  type,
  docType,
  archives,
  dateFrom,
  dateTo,
  showFilters,
}: {
  users: { id: string; name: string }[];
  activeProjectId?: string;
  libres?: boolean;
  departments?: { id: string; label: string }[];
  departementId?: string;
  query?: string;
  uploadedById?: string;
  type?: string;
  docType?: string;
  archives?: boolean;
  dateFrom?: string;
  dateTo?: string;
  // Demande utilisateur (2026-10-01) — en navigation par dossiers, les
  // filtres de documents (format, categorie, deposant, dates...) n'ont pas
  // de sens : seule la recherche reste. Ils n'apparaissent que sur la page
  // de resultats, pour affiner une liste qui, elle, est faite de documents.
  showFilters?: boolean;
}) {
  const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Dossiers libres et dossiers de projets, recherche, historique des versions.
          </p>
        </div>
        <ViewToggle active={showFilters ? "documents" : "dossiers"} />
      </div>
      <form className="flex flex-wrap items-center gap-2" action="/documents">
        {showFilters && <input type="hidden" name="vue" value="documents" />}
        {activeProjectId && <input type="hidden" name="projetId" value={activeProjectId} />}
        {libres && <input type="hidden" name="libres" value="1" />}
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Rechercher un document (Entrée)" defaultValue={query} className="pl-8" />
        </div>
        {showFilters && (
          <>
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
          </>
        )}
        {showFilters && (
          <Link href="/documents?vue=documents">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>
    </div>
  );
}
