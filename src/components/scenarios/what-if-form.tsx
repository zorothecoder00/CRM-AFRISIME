"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { runWhatIfSimulation } from "@/actions/scenario.actions";
import type { WhatIfInput, ScenarioImpact } from "@/lib/scenario-simulation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScenarioComparisonTable } from "@/components/scenarios/scenario-comparison-table";
import { PlayCircle } from "lucide-react";

type Option = { id: string; label: string };

const DEFAULT_INPUT: Omit<WhatIfInput, "departmentId"> = {
  deltaEffectifPercent: 0,
  deltaRessourcesPercent: 0,
  deltaProjetsPercent: 0,
  deltaCapacitePercent: 0,
  deltaDelaisJours: 0,
  deltaBudgetPercent: 0,
  deltaObjectifsCount: 0,
  nouvellesAgences: 0,
  effectifParAgence: 0,
  projetsParAgence: 0,
};

const FIELDS: { key: keyof typeof DEFAULT_INPUT; label: string; suffix?: string }[] = [
  { key: "deltaEffectifPercent", label: "Δ Effectif", suffix: "%" },
  { key: "deltaBudgetPercent", label: "Δ Budget", suffix: "%" },
  { key: "deltaProjetsPercent", label: "Δ Nombre de projets", suffix: "%" },
  { key: "deltaDelaisJours", label: "Δ Délais", suffix: "jours" },
  { key: "deltaCapacitePercent", label: "Δ Capacité", suffix: "%" },
  { key: "deltaObjectifsCount", label: "Δ Objectifs", suffix: "unités" },
  { key: "deltaRessourcesPercent", label: "Δ Ressources", suffix: "%" },
];

// V3.0 §8 — What-If Engine : les 8 variables du cahier des charges (effectif,
// budget, nombre de projets, délais, capacité, nombre d'agences, objectifs,
// ressources) pilotent computeWhatIfImpact (src/lib/scenario-simulation.ts).
// "Nombre d'agences" est traité à part (nécessite effectif/projets par
// agence) et remplace les leviers effectif/projets en % quand renseigné —
// même convention que le type NOUVELLE_FILIALE des scénarios persistés.
export function WhatIfForm({ departments }: { departments: Option[] }) {
  const [values, setValues] = useState(DEFAULT_INPUT);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<{ baseline: ScenarioImpact; impact: ScenarioImpact } | null>(null);
  const { run, isPending } = useAction(runWhatIfSimulation);

  function setField(key: keyof typeof DEFAULT_INPUT, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw === "" ? 0 : Number(raw) }));
  }

  async function handleSimulate() {
    const result = await run({ ...values, departmentId: departmentId ?? null });
    if (result.ok) setResult(result.data);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>
                  {f.label} {f.suffix ? `(${f.suffix})` : ""}
                </Label>
                <Input type="number" value={values[f.key]} onChange={(e) => setField(f.key, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Nombre d&apos;agences — si renseigné, remplace les leviers Δ Effectif/Δ Nombre de projets en % ci-dessus
              (mêmes convention qu&apos;un scénario « Nouvelle filiale »).
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Nouvelles agences</Label>
                <Input
                  type="number"
                  value={values.nouvellesAgences}
                  onChange={(e) => setField("nouvellesAgences", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Effectif / agence</Label>
                <Input
                  type="number"
                  value={values.effectifParAgence}
                  onChange={(e) => setField("effectifParAgence", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Projets / agence</Label>
                <Input
                  type="number"
                  value={values.projetsParAgence}
                  onChange={(e) => setField("projetsParAgence", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Portée (facultatif — vide = organisation entière)</Label>
            <Select onValueChange={(v) => setDepartmentId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Organisation entière" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSimulate} disabled={isPending}>
            <PlayCircle className="mr-1.5 h-4 w-4" />
            {isPending ? "Simulation..." : "SIMULER"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Situation actuelle vs situation simulée</h2>
          <ScenarioComparisonTable baseline={result.baseline} columns={[{ label: "Situation simulée", impact: result.impact }]} />
        </div>
      )}
    </div>
  );
}
