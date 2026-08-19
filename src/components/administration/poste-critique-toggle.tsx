"use client";

import { useAction } from "@/hooks/use-action";
import { setPosteCritique } from "@/actions/poste.actions";
import { Badge } from "@/components/ui/badge";

export function PosteCritiqueToggle({ posteId, critique }: { posteId: string; critique: boolean }) {
  const { run, isPending } = useAction(setPosteCritique);

  return (
    <button type="button" disabled={isPending} onClick={() => run({ id: posteId, critique: !critique })}>
      <Badge variant={critique ? "destructive" : "outline"}>{critique ? "Poste critique" : "Marquer critique"}</Badge>
    </button>
  );
}
