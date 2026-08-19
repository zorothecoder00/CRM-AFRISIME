"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

export function ScenarioMultiSelect({
  scenarios,
  initialSelectedIds,
  targetHref = "/scenarios/comparaison",
}: {
  scenarios: { id: string; nom: string; type: string }[];
  initialSelectedIds: string[];
  targetHref?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)));
  }

  function compare() {
    const params = new URLSearchParams();
    for (const id of selected) params.append("ids", id);
    router.push(`${targetHref}?${params.toString()}`);
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {scenarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun scénario créé pour le moment.</p>
        ) : (
          <div className="space-y-1">
            {scenarios.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selected.includes(s.id)} onCheckedChange={(c) => toggle(s.id, c === true)} />
                {s.nom}
              </label>
            ))}
          </div>
        )}
        <Button size="sm" onClick={compare} disabled={selected.length === 0}>
          Comparer ({selected.length})
        </Button>
      </CardContent>
    </Card>
  );
}
