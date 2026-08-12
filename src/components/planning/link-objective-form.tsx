"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { linkObjectiveToPlan } from "@/actions/plan.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

/** Rattache un objectif existant a ce plan (le retire de son eventuel plan actuel). */
export function LinkObjectiveForm({ planId, objectives }: { planId: string; objectives: Option[] }) {
  const [objectiveId, setObjectiveId] = useState<string | undefined>();
  const { run, isPending } = useAction(linkObjectiveToPlan, { successMessage: "Objectif rattaché au plan." });

  async function handleLink() {
    if (!objectiveId) return;
    const result = await run({ objectiveId, planId });
    if (result.ok) setObjectiveId(undefined);
  }

  if (objectives.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun autre objectif disponible.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={objectiveId} onValueChange={setObjectiveId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Sélectionner un objectif" />
        </SelectTrigger>
        <SelectContent>
          {objectives.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleLink} disabled={!objectiveId || isPending} size="sm">
        Rattacher
      </Button>
    </div>
  );
}
