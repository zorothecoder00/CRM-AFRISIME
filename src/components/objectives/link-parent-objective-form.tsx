"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { linkObjectiveParent } from "@/actions/objective.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

type Option = { id: string; label: string };

/** Rattache cet objectif à un objectif parent existant (cascade §III), ou le détache. */
export function LinkParentObjectiveForm({
  objectiveId,
  candidates,
  hasParent,
}: {
  objectiveId: string;
  candidates: Option[];
  hasParent: boolean;
}) {
  const [parentId, setParentId] = useState<string | undefined>();
  const { run, isPending } = useAction(linkObjectiveParent, { successMessage: "Objectif parent mis à jour." });

  async function handleLink() {
    if (!parentId) return;
    const result = await run({ objectiveId, parentId });
    if (result.ok) setParentId(undefined);
  }

  async function handleUnlink() {
    await run({ objectiveId });
  }

  return (
    <div className="flex items-center gap-2">
      {candidates.length > 0 && (
        <Select value={parentId} onValueChange={setParentId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sélectionner un objectif parent" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button onClick={handleLink} disabled={!parentId || isPending} size="sm">
        Rattacher
      </Button>
      {hasParent && (
        <Button
          onClick={handleUnlink}
          disabled={isPending}
          variant="ghost"
          size="icon-sm"
          aria-label="Détacher de l'objectif parent"
          title="Détacher de l'objectif parent"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
