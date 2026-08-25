"use client";

import { useAction } from "@/hooks/use-action";
import { generateStandardDocumentFolders } from "@/actions/document.actions";
import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";

/** Project Data Room (Project Studio §38) — génère les dossiers standards du cahier des charges. */
export function GenerateStandardFoldersButton({ projectId }: { projectId: string }) {
  const { run, isPending } = useAction(generateStandardDocumentFolders, {
    successMessage: (r) => (r.created > 0 ? `${r.created} dossier(s) créé(s).` : "Tous les dossiers standards existent déjà."),
  });

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={() => run(projectId)}>
      <FolderPlus className="mr-1 h-4 w-4" />
      Dossiers standards
    </Button>
  );
}
