"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateProjectCoutReel } from "@/actions/project.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProjectCoutReelForm({
  projectId,
  budget,
  initialValue,
  devise,
}: {
  projectId: string;
  budget: number | null;
  initialValue: number | null;
  devise: string;
}) {
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : "");
  const { run, isPending } = useAction(updateProjectCoutReel, { successMessage: "Coût réel enregistré." });

  async function handleSave() {
    if (!value.trim()) return;
    await run({ projectId, coutReel: value.trim() });
  }

  const depasse = budget !== null && Number(value) > budget;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.01"
        placeholder="Non renseigné"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-32"
      />
      <span className="text-xs text-muted-foreground">{devise}</span>
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        Enregistrer
      </Button>
      {depasse && <Badge variant="destructive">Budget dépassé</Badge>}
    </div>
  );
}
