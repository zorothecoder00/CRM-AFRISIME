"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateCourrierStatus } from "@/actions/courrier.actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABELS: Record<string, string> = {
  A_TRAITER: "À traiter",
  EN_COURS: "En cours",
  TRAITE: "Traité",
  ARCHIVE: "Archivé",
};

export function CourrierStatusSelect({
  courrierId,
  initialStatut,
}: {
  courrierId: string;
  initialStatut: string;
}) {
  const [statut, setStatut] = useState(initialStatut);
  const { run } = useAction(updateCourrierStatus, { successMessage: "Statut mis à jour." });

  async function handleChange(next: string) {
    setStatut(next);
    const result = await run({
      courrierId,
      statut: next as "A_TRAITER" | "EN_COURS" | "TRAITE" | "ARCHIVE",
    });
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
