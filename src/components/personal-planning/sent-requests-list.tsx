"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { cancelAvailabilityRequest } from "@/actions/personal-planning.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type SentRequestRow = {
  id: string;
  targetUserName: string;
  titre: string;
  dateDebut: string;
  dateFin: string;
  statut: "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "ANNULEE";
  motifRefus: string | null;
};

const STATUS_TONE: Record<SentRequestRow["statut"], "secondary" | "success" | "destructive" | "outline"> = {
  EN_ATTENTE: "secondary",
  ACCEPTEE: "success",
  REFUSEE: "destructive",
  ANNULEE: "outline",
};

const STATUS_LABEL: Record<SentRequestRow["statut"], string> = {
  EN_ATTENTE: "En attente",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
};

export function SentRequestsList({ requests: initial }: { requests: SentRequestRow[] }) {
  const [requests, setRequests] = useState(initial);
  const { run: cancel, isPending } = useAction(cancelAvailabilityRequest, { successMessage: "Demande annulée." });

  async function handleCancel(id: string) {
    const result = await cancel({ requestId: id });
    if (result.ok) setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, statut: "ANNULEE" as const } : r)));
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune demande envoyée.</p>;
  }

  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id} className="rounded-md border p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium">{r.titre}</div>
              <div className="text-xs text-muted-foreground">
                À {r.targetUserName} · {new Date(r.dateDebut).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </div>
              {r.statut === "REFUSEE" && r.motifRefus && (
                <p className="mt-1 text-xs text-muted-foreground">Motif : {r.motifRefus}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={STATUS_TONE[r.statut]}>{STATUS_LABEL[r.statut]}</Badge>
              {r.statut === "EN_ATTENTE" && (
                <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleCancel(r.id)}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
