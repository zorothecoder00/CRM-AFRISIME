"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { linkProgrammeToPlan } from "@/actions/plan.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

/** Rattache un programme existant a ce plan (le retire de son eventuel plan actuel). */
export function LinkProgrammeForm({ planId, programmes }: { planId: string; programmes: Option[] }) {
  const [programmeId, setProgrammeId] = useState<string | undefined>();
  const { run, isPending } = useAction(linkProgrammeToPlan, { successMessage: "Programme rattaché au plan." });

  async function handleLink() {
    if (!programmeId) return;
    const result = await run({ programmeId, planId });
    if (result.ok) setProgrammeId(undefined);
  }

  if (programmes.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun autre programme disponible.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={programmeId} onValueChange={setProgrammeId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Sélectionner un programme" />
        </SelectTrigger>
        <SelectContent>
          {programmes.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleLink} disabled={!programmeId || isPending} size="sm">
        Rattacher
      </Button>
    </div>
  );
}
