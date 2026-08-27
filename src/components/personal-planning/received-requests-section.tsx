"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { decideAvailabilityRequest } from "@/actions/personal-planning.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";

export type ReceivedRequestRow = {
  id: string;
  requestedByName: string;
  titre: string;
  message: string | null;
  dateDebut: string;
  dateFin: string;
};

function formatRange(dateDebut: string, dateFin: string) {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" };
  return `${new Date(dateDebut).toLocaleString("fr-FR", opts)} → ${new Date(dateFin).toLocaleString("fr-FR", opts)}`;
}

/** Demandes de créneau reçues sur mon planning personnel — accepter bloque automatiquement le créneau. */
export function ReceivedRequestsSection({ requests: initial }: { requests: ReceivedRequestRow[] }) {
  const [requests, setRequests] = useState(initial);
  const [refusingId, setRefusingId] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const { run: decide, isPending } = useAction(decideAvailabilityRequest);

  async function handleAccept(id: string) {
    const result = await decide({ requestId: id, statut: "ACCEPTEE" });
    if (result.ok) setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleRefuse(id: string) {
    const result = await decide({ requestId: id, statut: "REFUSEE", motifRefus: motif || undefined });
    if (result.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRefusingId(null);
      setMotif("");
    }
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>;
  }

  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id} className="rounded-md border p-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium">{r.titre}</div>
              <div className="text-xs text-muted-foreground">
                De {r.requestedByName} · {formatRange(r.dateDebut, r.dateFin)}
              </div>
              {r.message && <p className="mt-1 text-xs text-muted-foreground">{r.message}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleAccept(r.id)} aria-label="Accepter">
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setRefusingId(refusingId === r.id ? null : r.id)}
                aria-label="Refuser"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {refusingId === r.id && (
            <div className="mt-2 space-y-2">
              <Textarea placeholder="Motif du refus (optionnel)" value={motif} onChange={(e) => setMotif(e.target.value)} />
              <Button size="sm" variant="destructive" disabled={isPending} onClick={() => handleRefuse(r.id)}>
                Confirmer le refus
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
