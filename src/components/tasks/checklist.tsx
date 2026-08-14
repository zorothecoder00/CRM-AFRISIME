"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addChecklistItem, toggleChecklistItem } from "@/actions/task.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, User, Calendar } from "lucide-react";

export type ChecklistItemData = {
  id: string;
  label: string;
  isDone: boolean;
  responsableId: string | null;
  responsableName?: string | null;
  echeance: string | null;
};

type MemberOption = { id: string; name: string };

export function Checklist({
  taskId,
  items,
  members = [],
}: {
  taskId: string;
  items: ChecklistItemData[];
  members?: MemberOption[];
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newResponsableId, setNewResponsableId] = useState<string>("");
  const [newEcheance, setNewEcheance] = useState("");
  const { run: add, isPending } = useAction(addChecklistItem);
  const { run: toggle } = useAction(toggleChecklistItem);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    const result = await add(taskId, newLabel.trim(), newResponsableId || undefined, newEcheance || undefined);
    if (result.ok) {
      setNewLabel("");
      setNewResponsableId("");
      setNewEcheance("");
    }
  }

  async function handleToggle(itemId: string, isDone: boolean) {
    await toggle(itemId, isDone);
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={item.isDone}
              onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
            />
            <span className={item.isDone ? "text-sm text-muted-foreground line-through" : "text-sm"}>
              {item.label}
            </span>
          </div>
          {(item.responsableName || item.echeance) && (
            <div className="ml-6 flex items-center gap-3 text-xs text-muted-foreground">
              {item.responsableName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {item.responsableName}
                </span>
              )}
              {item.echeance && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(item.echeance).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <Input
          placeholder="Nouvel élément..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="min-w-[160px] flex-1"
        />
        {members.length > 0 && (
          <Select value={newResponsableId} onValueChange={setNewResponsableId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          type="date"
          value={newEcheance}
          onChange={(e) => setNewEcheance(e.target.value)}
          className="w-40"
        />
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
