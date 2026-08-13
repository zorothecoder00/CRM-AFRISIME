"use client";

import { useAction } from "@/hooks/use-action";
import { archiveDocument, unarchiveDocument } from "@/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";

export function DocumentArchiveButton({
  documentId,
  isArchived,
}: {
  documentId: string;
  isArchived: boolean;
}) {
  const { run: archive, isPending: archiving } = useAction(archiveDocument, {
    successMessage: "Document archivé.",
  });
  const { run: unarchive, isPending: unarchiving } = useAction(unarchiveDocument, {
    successMessage: "Document désarchivé.",
  });

  if (isArchived) {
    return (
      <Button variant="outline" size="sm" onClick={() => unarchive(documentId)} disabled={unarchiving}>
        <ArchiveRestore className="mr-1 h-4 w-4" />
        Désarchiver
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => archive(documentId)} disabled={archiving}>
      <Archive className="mr-1 h-4 w-4" />
      Archiver
    </Button>
  );
}
