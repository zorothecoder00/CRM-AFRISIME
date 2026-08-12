"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { linkCourrierTask } from "@/actions/courrier.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

/** Rattache une tâche existante à ce courrier (cahier des charges §IX — une tâche peut provenir d'un courrier). */
export function LinkTaskForm({ courrierId, tasks }: { courrierId: string; tasks: Option[] }) {
  const [taskId, setTaskId] = useState<string | undefined>();
  const { run, isPending } = useAction(linkCourrierTask, { successMessage: "Tâche rattachée." });

  async function handleLink() {
    if (!taskId) return;
    const result = await run({ courrierId, taskId });
    if (result.ok) setTaskId(undefined);
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune tâche disponible.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={taskId} onValueChange={setTaskId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Sélectionner une tâche" />
        </SelectTrigger>
        <SelectContent>
          {tasks.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleLink} disabled={!taskId || isPending} size="sm">
        Rattacher
      </Button>
    </div>
  );
}
