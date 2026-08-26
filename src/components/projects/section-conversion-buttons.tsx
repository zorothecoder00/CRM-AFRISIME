"use client";

import { useAction } from "@/hooks/use-action";
import { convertSectionToDeliverable, convertSectionToMilestone, convertSectionToRisk } from "@/actions/project.actions";
import { convertSectionToTask } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { QuickIndicatorDialog } from "@/components/projects/quick-indicator-dialog";
import { ListChecks, Package, Milestone, AlertTriangle } from "lucide-react";

/**
 * Conversion WBS (Project Studio §15) — un noeud de la hiérarchie devient
 * tâche/livrable/jalon/risque/indicateur. Risque et indicateur complètent
 * les 2 premiers (Project Studio §66 — "création d'une activité" peut faire
 * naître ces éléments), même principe de création en un clic (l'indicateur
 * ouvre une mini-boîte pour la valeur cible, seule donnée sans défaut
 * raisonnable), éditable ensuite.
 */
export function SectionConversionButtons({ sectionId, sectionNom, projectId }: { sectionId: string; sectionNom: string; projectId: string }) {
  const { run: toTask, isPending: p1 } = useAction(convertSectionToTask, { successMessage: "Tâche créée." });
  const { run: toDeliverable, isPending: p2 } = useAction(convertSectionToDeliverable, { successMessage: "Livrable créé." });
  const { run: toMilestone, isPending: p3 } = useAction(convertSectionToMilestone, { successMessage: "Jalon créé." });
  const { run: toRisk, isPending: p4 } = useAction(convertSectionToRisk, { successMessage: "Risque créé." });

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
      <Button
        variant="ghost"
        size="icon-sm"
        title="Créer un risque associé"
        disabled={p4}
        onClick={() => toRisk({ sectionId })}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </Button>
      <QuickIndicatorDialog projectId={projectId} nom={sectionNom} triggerLabel="Créer un indicateur associé" />
    </div>
  );
}
