"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateDecisionWeights } from "@/actions/decision-matrix.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CRITERES: { key: "poidsCout" | "poidsDelai" | "poidsRisque" | "poidsImpact" | "poidsRessources" | "poidsRoi" | "poidsFaisabilite"; label: string }[] = [
  { key: "poidsCout", label: "Coût" },
  { key: "poidsDelai", label: "Délai" },
  { key: "poidsRisque", label: "Risque" },
  { key: "poidsImpact", label: "Impact" },
  { key: "poidsRessources", label: "Ressources" },
  { key: "poidsRoi", label: "ROI" },
  { key: "poidsFaisabilite", label: "Faisabilité" },
];

export function DecisionWeightsForm({
  matrixId,
  initial,
}: {
  matrixId: string;
  initial: Record<string, number>;
}) {
  const [weights, setWeights] = useState(initial);
  const { run, isPending } = useAction(updateDecisionWeights, { successMessage: "Pondération mise à jour." });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CRITERES.map((c) => (
          <div key={c.key} className="space-y-1">
            <Label className="text-xs">{c.label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={weights[c.key]}
              onChange={(e) => setWeights((w) => ({ ...w, [c.key]: Number(e.target.value) }))}
              className="h-8"
            />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run({ matrixId, ...weights } as Parameters<typeof updateDecisionWeights>[0])}
      >
        Mettre à jour la pondération
      </Button>
    </div>
  );
}
