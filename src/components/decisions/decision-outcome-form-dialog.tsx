"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createDecisionOutcome } from "@/actions/decision-outcome.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function DecisionOutcomeFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [dateDecision, setDateDecision] = useState("");
  const { run, isPending } = useAction(createDecisionOutcome, { successMessage: "Décision enregistrée." });

  async function handleSubmit() {
    if (!titre.trim() || !dateDecision) return;
    const result = await run({ titre: titre.trim(), description: description.trim() || undefined, dateDecision });
    if (result.ok) {
      setOpen(false);
      setTitre("");
      setDescription("");
      setDateDecision("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Nouvelle décision
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle décision à suivre</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Décision</Label>
            <Input placeholder="Ex. Ouvrir une nouvelle agence" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date de la décision</Label>
            <Input type="date" value={dateDecision} onChange={(e) => setDateDecision(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!titre.trim() || !dateDecision || isPending} className="w-full">
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
