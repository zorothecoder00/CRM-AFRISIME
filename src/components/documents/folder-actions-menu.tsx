"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { deleteFolder } from "@/actions/document.actions";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";

/** Renommer / supprimer un dossier (le contenu d'un dossier supprime remonte d'un niveau). */
export function FolderActionsMenu({ folder }: { folder: { id: string; nom: string } }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const { run: remove } = useAction(deleteFolder, { successMessage: "Dossier supprimé." });

  return (
    <>
      <RowActionsMenu
        onEdit={() => setRenameOpen(true)}
        onDelete={() => remove(folder.id)}
        deleteConfirmLabel={`Supprimer le dossier « ${folder.nom} » ? Ses documents et sous-dossiers ne sont pas supprimés : ils remontent d'un niveau.`}
      />
      <FolderFormDialog folder={folder} open={renameOpen} onOpenChange={setRenameOpen} />
    </>
  );
}
