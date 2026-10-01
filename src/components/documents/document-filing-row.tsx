"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useAction } from "@/hooks/use-action";
import { createFolderWithDocument, moveDocumentToFolder } from "@/actions/document.actions";
import { deleteDocument } from "@/actions/trash.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, FolderInput, FolderMinus, FolderPlus, Trash2 } from "lucide-react";

/**
 * Ranger un document sans ouvrir sa fiche (demande utilisateur 2026-10-01) :
 * clic droit sur la carte, ou bouton "Ranger" pour le tactile / qui ne pense
 * pas au clic droit — les deux ouvrent les memes choix : un dossier de
 * l'espace, retirer du dossier, ou un nouveau dossier cree avec ce document
 * dedans. Bouton "Supprimer" a cote (corbeille, restaurable).
 *
 * Le bouton et le dialogue sont freres de la carte (pas dans son <Link>) :
 * leurs evenements React ne remontent donc pas jusqu'a la navigation.
 */
export function DocumentFilingRow({
  documentId,
  folderId,
  folders,
  canCreateFolder,
  canDelete = false,
  children,
}: {
  documentId: string;
  folderId: string | null;
  folders: { id: string; label: string }[];
  canCreateFolder: boolean;
  /** Propose "Supprimer" (envoi a la corbeille, restaurable). */
  canDelete?: boolean;
  /** La carte du document (lien vers sa fiche). */
  children: ReactNode;
}) {
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [nom, setNom] = useState("");
  const { run: move, isPending: moving } = useAction(moveDocumentToFolder, { successMessage: "Document rangé." });
  const { run: createWith, isPending: creating } = useAction(createFolderWithDocument, {
    successMessage: (folder) => `Dossier « ${folder.nom} » créé avec ce document.`,
  });

  const { run: trash, isPending: deleting } = useAction(deleteDocument, {
    successMessage: "Document déplacé dans la corbeille.",
  });
  function onDelete() {
    if (!confirm("Supprimer ce document ? Il sera déplacé dans la corbeille (restaurable).")) return;
    trash(documentId);
  }

  // Rangé : "Retirer du dossier" en premier, puis "Déplacer vers…" les
  // autres dossiers. Non classé : "Ranger dans…" les dossiers de l'espace.
  const targets = folders.filter((f) => f.id !== folderId);
  const currentLabel = folders.find((f) => f.id === folderId)?.label;

  function renderItems(
    Item: typeof ContextMenuItem | typeof DropdownMenuItem,
    Label: typeof ContextMenuLabel | typeof DropdownMenuLabel,
    Separator: typeof ContextMenuSeparator | typeof DropdownMenuSeparator
  ) {
    return (
      <>
        {folderId && (
          <>
            <Label>Dans « {currentLabel ?? "dossier"} »</Label>
            <Item disabled={moving} onSelect={() => move({ documentId, folderId: undefined })}>
              <FolderMinus className="h-3.5 w-3.5" />
              Retirer du dossier
            </Item>
            <Separator />
          </>
        )}
        <Label>{folderId ? "Déplacer vers…" : "Ranger dans…"}</Label>
        {targets.length === 0 && (
          <Item disabled>
            <span className="text-muted-foreground">Aucun {folderId ? "autre " : ""}dossier dans cet espace</span>
          </Item>
        )}
        {targets.map((f) => (
          <Item key={f.id} disabled={moving} onSelect={() => move({ documentId, folderId: f.id })}>
            <Folder className="h-3.5 w-3.5" />
            {f.label}
          </Item>
        ))}
      </>
    );
  }

  const newFolderItem = (Item: typeof ContextMenuItem | typeof DropdownMenuItem) =>
    canCreateFolder && (
      <Item
        onSelect={() => {
          setNom("");
          setNewFolderOpen(true);
        }}
      >
        <FolderPlus className="h-3.5 w-3.5" />
        Nouveau dossier avec ce document…
      </Item>
    );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (nom.trim().length < 2) return;
    const result = await createWith({ documentId, nom: nom.trim() });
    if (result.ok) setNewFolderOpen(false);
  }

  return (
    <div className="relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          {renderItems(ContextMenuItem, ContextMenuLabel, ContextMenuSeparator)}
          {canCreateFolder && <ContextMenuSeparator />}
          {newFolderItem(ContextMenuItem)}
          {canDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-destructive focus:text-destructive" disabled={deleting} onSelect={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer le document
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" title="Ranger, déplacer ou retirer du dossier (aussi par clic droit)">
              <FolderInput className="mr-1 h-4 w-4" />
              {folderId ? "Déplacer" : "Ranger"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-48">
            {renderItems(DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator)}
            {canCreateFolder && <DropdownMenuSeparator />}
            {newFolderItem(DropdownMenuItem)}
          </DropdownMenuContent>
        </DropdownMenu>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={deleting}
            onClick={onDelete}
            title="Supprimer le document (corbeille)"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Supprimer
          </Button>
        )}
      </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier avec ce document</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`new-folder-${documentId}`}>Nom du dossier</Label>
              <Input id={`new-folder-${documentId}`} value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
              {nom.length > 0 && nom.trim().length < 2 && <p className="text-sm text-destructive">Le nom est requis.</p>}
            </div>
            <Button type="submit" className="w-full" disabled={creating || nom.trim().length < 2}>
              {creating ? "Création..." : "Créer et y ranger le document"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
