"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { deleteProject, deleteTask, deleteDocument } from "@/actions/trash.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type EntityType = "Project" | "Task" | "Document";

const DELETE_ACTIONS = {
  Project: deleteProject,
  Task: deleteTask,
  Document: deleteDocument,
} as const;

const CONFIRM_LABEL: Record<EntityType, string> = {
  Project: "Supprimer ce projet ? Il sera déplacé dans la corbeille.",
  Task: "Supprimer cette tâche ? Elle sera déplacée dans la corbeille.",
  Document: "Supprimer ce document ? Il sera déplacé dans la corbeille.",
};

/** Supprime (corbeille, V2.2 §37) puis navigue vers la liste — voir trash.actions.ts pour la raison de ce pattern. */
export function DeleteToTrashButton({ entityType, id }: { entityType: EntityType; id: string }) {
  const router = useRouter();
  const { run, isPending } = useAction(DELETE_ACTIONS[entityType]);

  async function handleClick() {
    if (!confirm(CONFIRM_LABEL[entityType])) return;
    const result = await run(id);
    if (result.ok) router.push(result.data.redirectTo);
  }

  return (
    <Button variant="destructive" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="mr-1.5 h-4 w-4" />
      Supprimer
    </Button>
  );
}
