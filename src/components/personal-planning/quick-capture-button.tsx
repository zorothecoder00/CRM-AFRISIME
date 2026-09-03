"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { createPersonalPlanningEntry } from "@/actions/personal-planning.actions";
import { parseQuickCapture } from "@/lib/quick-capture-parser";
import { ENTRY_TYPE_META, ENTRY_TYPE_OPTIONS, type PersonalPlanningEntryType } from "@/lib/personal-planning-types";

type SelectableType = Exclude<PersonalPlanningEntryType, "RESERVE">;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap } from "lucide-react";
import { format } from "date-fns";

/** §30 « Capture rapide » : un champ texte, une proposition (titre/type/date), confirmable/éditable avant création. */
export function QuickCaptureButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"capture" | "confirm">("capture");
  const [text, setText] = useState("");
  const [titre, setTitre] = useState("");
  const [type, setType] = useState<SelectableType>("TACHE");
  const [dateDebut, setDateDebut] = useState("");
  const { run: submit, isPending } = useAction(createPersonalPlanningEntry, {
    successMessage: (r) => (r.warnings.length > 0 ? `Activité créée — ${r.warnings.join(" ")}` : "Activité créée."),
  });

  function reset() {
    setStep("capture");
    setText("");
  }

  function handleParse() {
    if (!text.trim()) return;
    const proposal = parseQuickCapture(text);
    setTitre(proposal.titre);
    setType(proposal.type as SelectableType);
    setDateDebut(format(proposal.dateDebut, "yyyy-MM-dd'T'HH:mm"));
    setStep("confirm");
  }

  async function handleConfirm() {
    const dateFin = new Date(new Date(dateDebut).getTime() + 60 * 60000);
    const result = await submit({
      titre,
      type,
      dateDebut,
      dateFin: format(dateFin, "yyyy-MM-dd'T'HH:mm"),
      priorite: "NORMALE",
      repetition: "AUCUNE",
      rappels: [],
      participantIds: [],
      etiquettes: [],
      piecesJointes: [],
    });
    if (result.ok) {
      setOpen(false);
      reset();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button size="sm" variant="outline" className="border-border bg-card text-foreground hover:bg-muted" onClick={() => setOpen(true)}>
        <Zap className="mr-1 h-4 w-4" />
        Capture rapide
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capture rapide</DialogTitle>
        </DialogHeader>

        {step === "capture" ? (
          <div className="space-y-3">
            <Label htmlFor="quick-capture-text">Écrivez simplement ce que vous avez à faire</Label>
            <Input
              id="quick-capture-text"
              placeholder="Ex. Appeler fournisseur demain matin"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleParse()}
              autoFocus
            />
            <Button className="w-full" onClick={handleParse} disabled={!text.trim()}>
              Continuer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="quick-capture-titre">Activité</Label>
              <Input id="quick-capture-titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ENTRY_TYPE_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quick-capture-date">Date / heure</Label>
                <Input id="quick-capture-date" type="datetime-local" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("capture")}>
                Retour
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={isPending || !titre.trim()}>
                {isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
