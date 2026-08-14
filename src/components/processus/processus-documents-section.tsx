"use client";

import { useAction } from "@/hooks/use-action";
import { deleteProcessusDocument } from "@/actions/processus.actions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type ProcessusDocumentRow = {
  id: string;
  nom: string;
  url: string;
  uploadedByName: string;
};

export function ProcessusDocumentsSection({
  documents,
  canManage,
}: {
  documents: ProcessusDocumentRow[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteProcessusDocument, { successMessage: "Document supprimé." });

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document.</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
        >
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 hover:underline">
            {doc.nom}
          </a>
          <span className="text-xs text-muted-foreground">{doc.uploadedByName}</span>
          {canManage && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(doc.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
