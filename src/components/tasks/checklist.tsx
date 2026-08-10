"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addChecklistItem, toggleChecklistItem } from "@/actions/task.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export type ChecklistItemData = { id: string; label: string; isDone: boolean };

export function Checklist({ taskId, items }: { taskId: string; items: ChecklistItemData[] }) {
  const [newLabel, setNewLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setIsSubmitting(true);
    try {
      await addChecklistItem(taskId, newLabel.trim());
      setNewLabel("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(itemId: string, isDone: boolean) {
    try {
      await toggleChecklistItem(itemId, isDone);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    }
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Checkbox
            checked={item.isDone}
            onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
          />
          <span className={item.isDone ? "text-sm text-muted-foreground line-through" : "text-sm"}>
            {item.label}
          </span>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Input
          placeholder="Nouvel élément..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isSubmitting}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
