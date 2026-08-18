"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateTransformationPhase } from "@/actions/transformation.actions";
import { TRANSFORMATION_PHASES } from "@/lib/validations/transformation.schema";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const PHASE_LABELS: Record<string, string> = {
  DIAGNOSTIC: "Diagnostic",
  PLAN: "Plan",
  TRANSFORMATION: "Transformation",
  ADOPTION: "Adoption",
  MESURE: "Mesure",
  AMELIORATION: "Amélioration",
};

// Cycle du cahier des charges V3.0 §19 : Diagnostic -> Plan -> Transformation
// -> Adoption -> Mesure -> Amélioration. Avancement manuel uniquement (une
// phase franchie ne se "détecte" pas automatiquement).
export function PhaseTracker({ transformationId, currentPhase, canManage }: { transformationId: string; currentPhase: string; canManage: boolean }) {
  const [bilanDialogOpen, setBilanDialogOpen] = useState(false);
  const [bilan, setBilan] = useState("");
  const { run, isPending } = useAction(updateTransformationPhase, { successMessage: "Phase mise à jour." });
  const currentIndex = TRANSFORMATION_PHASES.indexOf(currentPhase as (typeof TRANSFORMATION_PHASES)[number]);

  function handlePhaseClick(phase: (typeof TRANSFORMATION_PHASES)[number]) {
    if (phase === "AMELIORATION") {
      setBilanDialogOpen(true);
      return;
    }
    run({ id: transformationId, phase });
  }

  async function handleConfirmBilan() {
    const result = await run({ id: transformationId, phase: "AMELIORATION", bilan: bilan.trim() || undefined });
    if (result.ok) {
      setBilan("");
      setBilanDialogOpen(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TRANSFORMATION_PHASES.map((phase, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={phase} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canManage || isPending || active}
              onClick={() => handlePhaseClick(phase)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active && "border-primary bg-primary text-primary-foreground",
                done && !active && "border-success/40 bg-success/10 text-success",
                !active && !done && "text-muted-foreground hover:bg-muted",
                (!canManage || active) && "cursor-default"
              )}
            >
              {done && <Check className="h-3 w-3" />}
              {PHASE_LABELS[phase]}
            </button>
            {i < TRANSFORMATION_PHASES.length - 1 && <span className="text-muted-foreground">→</span>}
          </div>
        );
      })}

      <Dialog open={bilanDialogOpen} onOpenChange={setBilanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer le cycle de transformation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Le bilan est conservé dans la mémoire organisationnelle (retour d&apos;expérience), consultable pour les
              prochaines transformations similaires.
            </p>
            <Textarea placeholder="Bilan / retour d'expérience (optionnel)" value={bilan} onChange={(e) => setBilan(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBilanDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmBilan} disabled={isPending}>
              {isPending ? "Enregistrement..." : "Clôturer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
