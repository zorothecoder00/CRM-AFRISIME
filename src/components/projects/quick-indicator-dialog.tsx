"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { createProjectIndicator } from "@/actions/project.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target } from "lucide-react";

/**
 * Création rapide d'un indicateur depuis un noeud ToC (§65 — Single Source
 * of Truth) ou une activité WBS (§66 — Automatisations). Ne demande que la
 * valeur cible et l'unité — les seuls champs sans valeur par défaut
 * raisonnable ; nom/définition sont pré-remplis par l'appelant.
 */
export function QuickIndicatorDialog({
  projectId,
  nom,
  definition,
  theoryOfChangeNodeId,
  triggerLabel = "Créer un indicateur",
  triggerIcon = true,
}: {
  projectId: string;
  nom: string;
  definition?: string | null;
  theoryOfChangeNodeId?: string;
  triggerLabel?: string;
  triggerIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [valeurCible, setValeurCible] = useState("");
  const [unite, setUnite] = useState("");
  const { run: submit, isPending } = useAction(createProjectIndicator, { successMessage: "Indicateur créé." });

  async function handleCreate() {
    const result = await submit({
      projectId,
      nom,
      valeurCible,
      unite: unite || undefined,
      definition: definition || undefined,
      theoryOfChangeNodeId,
    });
    if (result.ok) {
      setValeurCible("");
      setUnite("");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title={triggerLabel} aria-label={triggerLabel}>
          {triggerIcon ? <Target className="h-3.5 w-3.5" /> : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Créer un indicateur — {nom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qi-cible">Valeur cible</Label>
            <Input id="qi-cible" type="number" step="0.01" value={valeurCible} onChange={(e) => setValeurCible(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qi-unite">Unité (facultatif)</Label>
            <Input id="qi-unite" placeholder="%, personnes, FCFA..." value={unite} onChange={(e) => setUnite(e.target.value)} />
          </div>
          <Button className="w-full" disabled={isPending || !valeurCible} onClick={handleCreate}>
            {isPending ? "Création..." : "Créer l'indicateur"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
