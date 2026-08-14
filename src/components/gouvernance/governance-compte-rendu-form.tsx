"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateGovernanceMeeting } from "@/actions/gouvernance.actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export function GovernanceCompteRenduForm({
  meetingId,
  initialCompteRendu,
  initialStatut,
}: {
  meetingId: string;
  initialCompteRendu: string;
  initialStatut: string;
}) {
  const [compteRendu, setCompteRendu] = useState(initialCompteRendu);
  const [statut, setStatut] = useState(initialStatut);
  const { run, isPending } = useAction(updateGovernanceMeeting, { successMessage: "Compte rendu enregistré." });

  async function handleSave() {
    await run({ meetingId, compteRendu, statut: statut as never });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Select value={statut} onValueChange={setStatut}>
          <SelectTrigger className="w-48">
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
      </div>
      <Textarea
        placeholder="Compte rendu de la réunion..."
        value={compteRendu}
        onChange={(e) => setCompteRendu(e.target.value)}
        rows={5}
      />
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
