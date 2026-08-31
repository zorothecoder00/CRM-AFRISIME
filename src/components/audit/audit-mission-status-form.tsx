"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateAuditMission } from "@/actions/audit.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUT_LABELS: Record<string, string> = {
  PREPARATION: "Préparation",
  COLLECTE: "Collecte",
  VERIFICATION: "Vérification",
  RAPPORT: "Rapport",
  CLOTUREE: "Clôturée",
};

export function AuditMissionStatusForm({
  missionId,
  titre,
  statut,
  rapport,
}: {
  missionId: string;
  titre: string;
  statut: string;
  rapport: string | null;
}) {
  const [nextStatut, setNextStatut] = useState(statut);
  const [nextRapport, setNextRapport] = useState(rapport ?? "");
  const { run: update, isPending } = useAction(updateAuditMission, { successMessage: "Mission mise à jour." });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={nextStatut} onValueChange={setNextStatut}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rapport">Rapport</Label>
        <Textarea
          id="rapport"
          rows={6}
          placeholder="Synthèse des travaux, conclusions..."
          value={nextRapport}
          onChange={(e) => setNextRapport(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => update({ missionId, titre, statut: nextStatut as never, rapport: nextRapport || undefined })}
      >
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
