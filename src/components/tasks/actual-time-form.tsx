"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateActualTime } from "@/actions/task.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ActualTimeForm({
  taskId,
  initialValue,
}: {
  taskId: string;
  initialValue: number | null;
}) {
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : "");
  const { run, isPending } = useAction(updateActualTime, { successMessage: "Temps réel enregistré." });

  async function handleSave() {
    if (!value.trim()) return;
    await run(taskId, value.trim());
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.5"
        placeholder="Non renseigné"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-24"
      />
      <span className="text-xs text-muted-foreground">h</span>
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        Enregistrer
      </Button>
    </div>
  );
}
