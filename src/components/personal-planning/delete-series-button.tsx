"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { deletePersonalPlanningEntrySeries } from "@/actions/personal-planning.actions";
import { Trash2 } from "lucide-react";

/** §44 — supprime toutes les occurrences futures d'une série récurrente (le passé reste consultable). */
export function DeleteSeriesButton({ recurrenceGroupId, titre }: { recurrenceGroupId: string; titre: string }) {
  const { run, isPending } = useAction(deletePersonalPlanningEntrySeries, {
    successMessage: (r) => (r.count > 0 ? `${r.count} occurrence(s) supprimée(s).` : "Aucune occurrence future à supprimer."),
  });

  async function handleDelete() {
    if (!window.confirm(`Supprimer toutes les occurrences futures de « ${titre} » ?`)) return;
    await run({ recurrenceGroupId });
  }

  return (
    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isPending} onClick={handleDelete}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
