"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { moveDocumentToFolder } from "@/actions/document.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROOT = "__root__";

/**
 * Range le document dans un dossier de son espace (projet ou documents
 * libres) ou l'en retire ("Aucun dossier"). Les dossiers proposes sont deja
 * filtres cote serveur sur le meme espace que le document.
 */
export function DocumentFolderSelect({
  documentId,
  folderId,
  folders,
}: {
  documentId: string;
  folderId: string | null;
  folders: { id: string; label: string }[];
}) {
  const [value, setValue] = useState(folderId ?? ROOT);
  const { run: move, isPending } = useAction(moveDocumentToFolder, { successMessage: "Dossier du document mis à jour." });

  async function onChange(next: string) {
    const previous = value;
    setValue(next);
    const result = await move({ documentId, folderId: next === ROOT ? undefined : next });
    if (!result.ok) setValue(previous);
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ROOT}>Aucun dossier (racine)</SelectItem>
        {folders.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {f.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
