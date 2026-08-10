"use client";

import { useState } from "react";
import { toast } from "sonner";
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

  async function handleChange(next: string) {
    setStatut(next);
    try {
      await updateObjectiveStatus(objectiveId, next);
      toast.success("Statut mis à jour.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
      setStatut(initialStatut);
    }
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
