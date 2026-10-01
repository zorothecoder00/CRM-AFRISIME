"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useAction } from "@/hooks/use-action";
import { createFolderWithDocument, moveDocumentToFolder } from "@/actions/document.actions";
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
import { Check, FolderInput, FolderPlus } from "lucide-react";

/**
 * Ranger un document sans ouvrir sa fiche (demande utilisateur 2026-10-01) :
 * clic droit sur la carte, ou bouton "Ranger" pour le tactile / qui ne pense
 * pas au clic droit — les deux ouvrent les memes choix : un dossier de
 * l'espace, la racine, ou un nouveau dossier cree avec ce document dedans.
 *
 * Le bouton et le dialogue sont freres de la carte (pas dans son <Link>) :
 * leurs evenements React ne remontent donc pas jusqu'a la navigation.
 */
export function DocumentFilingRow({
  documentId,
  folderId,
  folders,
  canCreateFolder,
  children,
}: {
  documentId: string;
  folderId: string | null;
  folders: { id: string; label: string }[];
  canCreateFolder: boolean;
  /** La carte du document (lien vers sa fiche). */
  children: ReactNode;
}) {
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [nom, setNom] = useState("");
  const { run: move, isPending: moving } = useAction(moveDocumentToFolder, { successMessage: "Document rangé." });
  const { run: createWith, isPending: creating } = useAction(createFolderWithDocument, {
    successMessage: (folder) => `Dossier « ${folder.nom} » créé avec ce document.`,
  });

  const choices = [{ id: null as string | null, label: "Racine (aucun dossier)" }, ...folders];

  function renderItems(Item: typeof ContextMenuItem | typeof DropdownMenuItem) {
    return (
      <>
        {choices.map((c) => (
          <Item key={c.id ?? "root"} disabled={c.id === folderId || moving} onSelect={() => move({ documentId, folderId: c.id ?? undefined })}>
            {c.id === folderId ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
            {c.label}
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
          <ContextMenuLabel>Ranger dans…</ContextMenuLabel>
          <ContextMenuSeparator />
          {renderItems(ContextMenuItem)}
          {canCreateFolder && <ContextMenuSeparator />}
          {newFolderItem(ContextMenuItem)}
        </ContextMenuContent>
      </ContextMenu>

      <div className="absolute top-1/2 right-2 -translate-y-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Ranger dans un dossier" title="Ranger dans un dossier (ou clic droit)">
              <FolderInput className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-48">
            <DropdownMenuLabel>Ranger dans…</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {renderItems(DropdownMenuItem)}
            {canCreateFolder && <DropdownMenuSeparator />}
            {newFolderItem(DropdownMenuItem)}
          </DropdownMenuContent>
        </DropdownMenu>
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
