"use client";

import { useAction } from "@/hooks/use-action";
import { convertSectionToDeliverable, convertSectionToMilestone } from "@/actions/project.actions";
import { convertSectionToTask } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { ListChecks, Package, Milestone } from "lucide-react";

/** Conversion WBS (Project Studio §15) — un noeud de la hiérarchie devient tâche/livrable/jalon. */
export function SectionConversionButtons({ sectionId }: { sectionId: string }) {
  const { run: toTask, isPending: p1 } = useAction(convertSectionToTask, { successMessage: "Tâche créée." });
  const { run: toDeliverable, isPending: p2 } = useAction(convertSectionToDeliverable, { successMessage: "Livrable créé." });
  const { run: toMilestone, isPending: p3 } = useAction(convertSectionToMilestone, { successMessage: "Jalon créé." });

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        title="Convertir en tâche"
        disabled={p1}
        onClick={() => toTask({ sectionId })}
      >
        <ListChecks className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Convertir en livrable"
        disabled={p2}
        onClick={() => toDeliverable({ sectionId })}
      >
        <Package className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Convertir en jalon"
        disabled={p3}
        onClick={() => toMilestone({ sectionId })}
      >
        <Milestone className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
