"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { cancelTransformation } from "@/actions/transformation.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function CancelTransformationButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const { run, isPending } = useAction(cancelTransformation, { successMessage: "Transformation annulée." });

  async function handleConfirm() {
    const result = await run({ id, motif: motif.trim() || undefined });
    if (result.ok) {
      setMotif("");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Annuler la transformation
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler cette transformation</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Le motif est conservé dans la mémoire organisationnelle, pour expliquer plus tard pourquoi cette
            transformation a été abandonnée.
          </p>
          <Textarea placeholder="Motif d'annulation (optionnel)" value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Retour
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Annulation..." : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
