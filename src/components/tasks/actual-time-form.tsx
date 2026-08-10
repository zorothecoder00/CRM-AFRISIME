"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setIsSubmitting(true);
    try {
      await updateActualTime(taskId, value.trim());
      toast.success("Temps réel enregistré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
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
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isSubmitting}>
        Enregistrer
      </Button>
    </div>
  );
}
