import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderActionsMenu } from "@/components/documents/folder-actions-menu";
import { ChevronRight, Folder, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrowserFolder = {
  id: string;
  nom: string;
  parentId: string | null;
  documentCount: number;
};

export type Crumb = { label: string; href: string };

/**
 * Navigation par dossiers d'un espace documentaire (demande utilisateur
 * 2026-10-01). Les dossiers servent a NE PAS afficher tous les documents
 * d'un coup : on ne montre ici que les tuiles de dossiers (et une tuile
 * "Non classés" pour les documents rangés nulle part) ; la page n'affiche
 * les documents qu'une fois un dossier ouvert.
 */
export function FolderBrowser({
  folders,
  currentFolderId,
  crumbs = [],
  extraCrumb,
  buildHref,
  canManage,
  unfiled,
  tileClassName,
}: {
  /** Tous les dossiers de l'espace (a plat, parentId pour la hierarchie). */
  folders: BrowserFolder[];
  currentFolderId?: string;
  /** Fil d'Ariane avant les dossiers (ex. Documents › Projet A). Vide : pas de fil. */
  crumbs?: Crumb[];
  /** Dernier element hors dossier (ex. "Non classés"). */
  extraCrumb?: string;
  buildHref: (folderId: string) => string;
  canManage: boolean;
  /** Tuile "Non classés" (documents sans dossier), affichee si count > 0. */
  unfiled?: { href: string; count: number };
  tileClassName?: string;
}) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail: BrowserFolder[] = [];
  for (let f = currentFolderId ? byId.get(currentFolderId) : undefined; f && trail.length < 50; f = f.parentId ? byId.get(f.parentId) : undefined) {
    trail.unshift(f);
  }
  const children = folders.filter((f) => f.parentId === (currentFolderId ?? null));
  const subfolderCount = (id: string) => folders.filter((f) => f.parentId === id).length;
  const showUnfiled = !!unfiled && unfiled.count > 0 && !currentFolderId;

  const allCrumbs: { key: string; label: string; href?: string }[] = [
    ...crumbs.map((c) => ({ key: c.href, label: c.label, href: c.href })),
    ...trail.map((f) => ({ key: f.id, label: f.nom, href: buildHref(f.id) })),
    ...(extraCrumb ? [{ key: "extra", label: extraCrumb }] : []),
  ];

  return (
    <div className="space-y-3">
      {allCrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Fil d'Ariane des dossiers">
          {allCrumbs.map((c, i) => {
            const isLast = i === allCrumbs.length - 1;
            return (
              <span key={c.key} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                {c.href && !isLast ? (
                  <Link href={c.href} className="text-muted-foreground hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-semibold">{c.label}</span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {(children.length > 0 || showUnfiled) && (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((f) => {
            const subCount = subfolderCount(f.id);
            return (
              <li key={f.id}>
                <FolderTile
                  href={buildHref(f.id)}
                  label={f.nom}
                  detail={`${f.documentCount} document(s)${subCount > 0 ? ` · ${subCount} sous-dossier(s)` : ""}`}
                  className={tileClassName}
                  actions={canManage ? <FolderActionsMenu folder={{ id: f.id, nom: f.nom }} /> : undefined}
                />
              </li>
            );
          })}
          {showUnfiled && (
            <li>
              <FolderTile
                href={unfiled.href}
                label="Non classés"
                detail={`${unfiled.count} document(s) hors dossier`}
                icon="unfiled"
                className={tileClassName}
              />
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Tuile de dossier, au meme format que les anciennes cartes d'espace de
 * /documents (demande utilisateur : garder la taille d'avant). Lien etire
 * sur toute la carte (after:inset-0) plutot que la carte dans un <Link> : le
 * menu d'actions et son dialogue de renommage ne doivent pas declencher la
 * navigation.
 */
export function FolderTile({
  href,
  label,
  detail,
  icon = "folder",
  actions,
  className,
}: {
  href: string;
  label: string;
  detail: string;
  icon?: "folder" | "unfiled";
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("relative h-full transition-all hover:-translate-y-0.5", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          {icon === "folder" ? (
            <Folder className="h-5 w-5 shrink-0 fill-current text-amber-500" />
          ) : (
            <Inbox className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <Link href={href} className="truncate after:absolute after:inset-0">
            {label}
          </Link>
        </CardTitle>
        {actions && <div className="relative z-10">{actions}</div>}
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}
