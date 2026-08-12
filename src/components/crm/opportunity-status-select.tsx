"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateOpportunityStatus } from "@/actions/crm.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  QUALIFICATION: "Qualification",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNEE: "Gagnée",
  PERDUE: "Perdue",
};

export function OpportunityStatusSelect({
  opportunityId,
  initialStatut,
}: {
  opportunityId: string;
  initialStatut: string;
}) {
  const [statut, setStatut] = useState(initialStatut);
  const { run } = useAction(updateOpportunityStatus, { successMessage: "Statut mis à jour." });

  async function handleChange(next: string) {
    setStatut(next);
    const result = await run({
      id: opportunityId,
      statut: next as "NOUVEAU" | "QUALIFICATION" | "PROPOSITION" | "NEGOCIATION" | "GAGNEE" | "PERDUE",
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
