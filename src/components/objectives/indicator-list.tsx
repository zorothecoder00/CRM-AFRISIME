"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateIndicatorValue } from "@/actions/objective.actions";
import { indicatorProgress } from "@/lib/objective-progress";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type IndicatorData = {
  id: string;
  nom: string;
  unite: string | null;
  valeurCible: number;
  valeurActuelle: number;
};

function IndicatorRow({ indicator }: { indicator: IndicatorData }) {
  const [value, setValue] = useState(String(indicator.valeurActuelle));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const progress = indicatorProgress(Number(value) || 0, indicator.valeurCible);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await updateIndicatorValue({ indicatorId: indicator.id, valeurActuelle: value });
      toast.success("Indicateur mis à jour.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{indicator.nom}</span>
        <span className="text-muted-foreground">
          {value} / {indicator.valeurCible} {indicator.unite ?? ""} ({progress}%)
        </span>
      </div>
      <ProgressBar value={progress} className="mt-2" />
      <div className="mt-2 flex gap-2">
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8"
        />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={isSubmitting}>
          Mettre à jour
        </Button>
      </div>
    </div>
  );
}

export function IndicatorList({ indicators }: { indicators: IndicatorData[] }) {
  if (indicators.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun indicateur pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {indicators.map((indicator) => (
        <IndicatorRow key={indicator.id} indicator={indicator} />
      ))}
    </div>
  );
}
