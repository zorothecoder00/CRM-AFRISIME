"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateCompteRendu } from "@/actions/meeting.actions";
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

export function CompteRenduForm({
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await updateCompteRendu({ meetingId, compteRendu, statut: statut as never });
      toast.success("Compte rendu enregistré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
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
      <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
