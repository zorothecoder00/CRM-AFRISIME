"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { addDependency } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DependencyData = { id: string; titre: string };

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await addDependency(taskId, selected);
      setSelected(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
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
        </Link>
      ))}
      {dependencies.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune dépendance.</p>
      )}
      <div className="flex gap-2 pt-1">
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
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isSubmitting || !selected}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}
