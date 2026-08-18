"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateHealthScoreWeight } from "@/actions/health-score.actions";
import type { HealthScoreDimension } from "@/generated/prisma/enums";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function HealthScoreWeightRow({
  dimension,
  label,
  initialPoids,
  initialActive,
}: {
  dimension: HealthScoreDimension;
  label: string;
  initialPoids: number;
  initialActive: boolean;
}) {
  const [poids, setPoids] = useState(initialPoids);
  const [active, setActive] = useState(initialActive);
  const { run, isPending } = useAction(updateHealthScoreWeight, { successMessage: "Poids mis à jour." });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={100}
            value={poids}
            onChange={(e) => setPoids(Number(e.target.value))}
            className="h-8 w-16"
            disabled={isPending}
          />
          <span className="text-xs text-muted-foreground">poids</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch checked={active} onCheckedChange={(v) => setActive(v)} disabled={isPending} />
          <Label className="text-xs text-muted-foreground">Incluse</Label>
        </div>
        <button
          type="button"
          className="text-xs text-primary hover:underline disabled:opacity-50"
          disabled={isPending}
          onClick={() => run(dimension, poids, active)}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
