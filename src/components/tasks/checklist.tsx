"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addChecklistItem, toggleChecklistItem } from "@/actions/task.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export type ChecklistItemData = { id: string; label: string; isDone: boolean };

export function Checklist({ taskId, items }: { taskId: string; items: ChecklistItemData[] }) {
  const [newLabel, setNewLabel] = useState("");
  const { run: add, isPending } = useAction(addChecklistItem);
  const { run: toggle } = useAction(toggleChecklistItem);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    const result = await add(taskId, newLabel.trim());
    if (result.ok) setNewLabel("");
  }

  async function handleToggle(itemId: string, isDone: boolean) {
    await toggle(itemId, isDone);
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
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
