"use client";

import { useAction } from "@/hooks/use-action";
import { restoreProject, restoreTask, restoreDocument, purgeTrashItem } from "@/actions/trash.actions";
import { Button } from "@/components/ui/button";

type EntityType = "Project" | "Task" | "Document";

const RESTORE_ACTIONS = {
  Project: restoreProject,
  Task: restoreTask,
  Document: restoreDocument,
} as const;

export function TrashItemActions({ entityType, id, canPurge }: { entityType: EntityType; id: string; canPurge: boolean }) {
  const restore = useAction(RESTORE_ACTIONS[entityType], { successMessage: "Élément restauré." });
  const purge = useAction(purgeTrashItem, { successMessage: "Supprimé définitivement." });

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.run(id)}>
        Restaurer
      </Button>
      {canPurge && (
        <Button
          size="sm"
          variant="destructive"
          disabled={purge.isPending}
          onClick={() => {
            if (confirm("Supprimer définitivement ? Cette action est irréversible.")) purge.run(entityType, id);
          }}
        >
          Supprimer définitivement
        </Button>
      )}
    </div>
  );
}
