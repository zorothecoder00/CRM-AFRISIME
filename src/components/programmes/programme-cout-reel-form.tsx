"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateProgrammeCoutReel } from "@/actions/programme.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProgrammeCoutReelForm({
  programmeId,
  budget,
  initialValue,
}: {
  programmeId: string;
  budget: number | null;
  initialValue: number | null;
}) {
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : "");
  const { run, isPending } = useAction(updateProgrammeCoutReel, { successMessage: "Coût réel enregistré." });

  async function handleSave() {
    if (!value.trim()) return;
    await run({ programmeId, coutReel: value.trim() });
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
      <span className="text-xs text-muted-foreground">FCFA</span>
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        Enregistrer
      </Button>
      {depasse && <Badge variant="destructive">Budget dépassé</Badge>}
    </div>
  );
}
