"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { evaluateDecisionOutcome } from "@/actions/decision-outcome.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardCheck } from "lucide-react";

export function DecisionOutcomeEvaluateDialog({ outcomeId }: { outcomeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [objectifAtteint, setObjectifAtteint] = useState(true);
  const [coutReel, setCoutReel] = useState("");
  const [delaiJours, setDelaiJours] = useState("");
  const [performance, setPerformance] = useState("");
  const [incidents, setIncidents] = useState("");
  const [roiPercent, setRoiPercent] = useState("");
  const [enseignements, setEnseignements] = useState("");
  const { run, isPending } = useAction(evaluateDecisionOutcome, { successMessage: "Évaluation enregistrée." });

  async function handleSubmit() {
    const result = await run({
      id: outcomeId,
      objectifAtteint,
      coutReel: coutReel ? Number(coutReel) : undefined,
      delaiJours: delaiJours ? Number(delaiJours) : undefined,
      performance: performance.trim() || undefined,
      incidents: incidents.trim() || undefined,
      roiPercent: roiPercent ? Number(roiPercent) : undefined,
      enseignements: enseignements.trim() || undefined,
    });
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Évaluer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Évaluer les conséquences de la décision</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Objectif atteint</Label>
            <Switch checked={objectifAtteint} onCheckedChange={setObjectifAtteint} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Coût réel</Label>
              <Input type="number" value={coutReel} onChange={(e) => setCoutReel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Délai (jours)</Label>
              <Input type="number" value={delaiJours} onChange={(e) => setDelaiJours(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ROI (%)</Label>
            <Input type="number" value={roiPercent} onChange={(e) => setRoiPercent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Performance observée</Label>
            <Textarea rows={2} value={performance} onChange={(e) => setPerformance(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Incidents</Label>
            <Textarea rows={2} value={incidents} onChange={(e) => setIncidents(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Enseignements</Label>
            <Textarea rows={2} value={enseignements} onChange={(e) => setEnseignements(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? "Enregistrement..." : "Enregistrer l'évaluation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
