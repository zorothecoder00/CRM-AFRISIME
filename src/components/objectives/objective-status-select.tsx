"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateObjectiveStatus } from "@/actions/objective.actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  ATTEINT: "Atteint",
  NON_ATTEINT: "Non atteint",
  ANNULE: "Annulé",
};

export function ObjectiveStatusSelect({
  objectiveId,
  initialStatut,
}: {
  objectiveId: string;
  initialStatut: string;
}) {
  const [statut, setStatut] = useState(initialStatut);
  const { run } = useAction(updateObjectiveStatus, { successMessage: "Statut mis à jour." });

  async function handleChange(next: string) {
    setStatut(next);
    const result = await run(objectiveId, next);
    if (!result.ok) setStatut(initialStatut);
  }

  return (
    <Select value={statut} onValueChange={handleChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
