"use client";

import { useMemo, useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addDocumentsToFolder } from "@/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FilePlus2 } from "lucide-react";

export type FolderCandidate = {
  id: string;
  nom: string;
  /** Emplacement actuel ("Non classé" ou chemin du dossier). */
  emplacement: string;
};

/**
 * Bouton "Ajouter des documents" d'un dossier ouvert (demande utilisateur
 * 2026-10-01) : choisir, parmi les documents deja deposes dans le meme
 * espace, ceux a ranger dans ce dossier — plusieurs a la fois.
 */
export function AddDocumentsToFolderDialog({
  folderId,
  folderName,
  candidates,
}: {
  folderId: string;
  folderName: string;
  candidates: FolderCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { run: add, isPending } = useAction(addDocumentsToFolder, {
    successMessage: ({ count }) => `${count} document(s) ajouté(s) à « ${folderName} ».`,
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? candidates.filter((c) => c.nom.toLowerCase().includes(q)) : candidates;
  }, [candidates, query]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setSelected(new Set());
    }
  }

  async function onSubmit() {
    const result = await add({ folderId, documentIds: [...selected] });
    if (result.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="mr-1 h-4 w-4" />
          Ajouter des documents
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des documents à « {folderName} »</DialogTitle>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun autre document dans cet espace. Utilisez « Nouveau document » pour en déposer un directement ici.
          </p>
        ) : (
          <div className="space-y-3">
            <Input placeholder="Filtrer par nom..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <ul className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-1">
              {visible.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                    <span className="min-w-0 flex-1 truncate">{c.nom}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.emplacement}</span>
                  </label>
                </li>
              ))}
              {visible.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">Aucun document ne correspond.</li>}
            </ul>
            <Button className="w-full" disabled={selected.size === 0 || isPending} onClick={onSubmit}>
              {isPending ? "Ajout..." : `Ajouter ${selected.size || ""} document(s) à ce dossier`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
