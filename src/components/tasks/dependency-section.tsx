"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { addDependency } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DependencyData = { id: string; titre: string; type?: string };

const DEPENDENCY_TYPE_LABELS: Record<string, string> = {
  FINISH_TO_START: "Fin → Début (FS)",
  START_TO_START: "Début → Début (SS)",
  FINISH_TO_FINISH: "Fin → Fin (FF)",
  START_TO_FINISH: "Début → Fin (SF)",
};

export function DependencySection({
  taskId,
  dependencies,
  otherTasks,
}: {
  taskId: string;
  dependencies: DependencyData[];
  otherTasks: DependencyData[];
}) {
  const [selected, setSelected] = useState<string | undefined>();
  const [type, setType] = useState<string>("FINISH_TO_START");
  const { run, isPending } = useAction(addDependency);

  async function handleAdd() {
    if (!selected) return;
    const result = await run(taskId, selected, type);
    if (result.ok) setSelected(undefined);
  }

  return (
    <div className="space-y-2">
      {dependencies.map((dep) => (
        <Link
          key={dep.id}
          href={`/taches/${dep.id}`}
          className="block rounded-md border p-2 text-sm hover:bg-muted"
        >
          Bloquée par : {dep.titre}
          {dep.type && DEPENDENCY_TYPE_LABELS[dep.type] && (
            <span className="ml-1.5 text-xs text-muted-foreground">({DEPENDENCY_TYPE_LABELS[dep.type]})</span>
          )}
        </Link>
      ))}
      {dependencies.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune dépendance.</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Ajouter une dépendance..." />
          </SelectTrigger>
          <SelectContent>
            {otherTasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.titre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DEPENDENCY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isPending || !selected}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}
