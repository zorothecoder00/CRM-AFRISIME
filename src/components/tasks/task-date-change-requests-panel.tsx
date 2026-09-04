"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { decideTaskDateChange } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";

export type TaskDateChangeRequestRow = {
  id: string;
  requestedByName: string;
  motif: string;
  currentDateDebut: string | null;
  requestedDateDebut: string | null;
  currentEcheance: string | null;
  requestedEcheance: string | null;
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";
}

/**
 * Demandes de report de date en attente sur cette tâche — visible
 * uniquement par qui peut les décider (voir decideTaskDateChange : le
 * responsable principal pour les demandes des co-assignés, sinon un manager
 * avec TASK_UPDATE). Accepter applique immédiatement la nouvelle date sur
 * la tâche.
 */
export function TaskDateChangeRequestsPanel({ requests: initial }: { requests: TaskDateChangeRequestRow[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initial);
  const [refusingId, setRefusingId] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const { run: decide, isPending } = useAction(decideTaskDateChange);

  async function handleAccept(id: string) {
    const result = await decide({ requestId: id, statut: "ACCEPTEE" });
    if (result.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    }
  }

  async function handleRefuse(id: string) {
    const result = await decide({ requestId: id, statut: "REFUSEE", decisionMotif: motif || undefined });
    if (result.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRefusingId(null);
      setMotif("");
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-warning/40 bg-warning/5 p-3">
      <p className="text-sm font-medium text-warning">
        {requests.length} demande{requests.length > 1 ? "s" : ""} de report en attente
      </p>
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="rounded-md border bg-card p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <div className="font-medium">{r.requestedByName}</div>
                {r.requestedDateDebut && (
                  <div className="text-xs text-muted-foreground">
                    Début : {formatDate(r.currentDateDebut)} → {formatDate(r.requestedDateDebut)}
                  </div>
                )}
                {r.requestedEcheance && (
                  <div className="text-xs text-muted-foreground">
                    Échéance : {formatDate(r.currentEcheance)} → {formatDate(r.requestedEcheance)}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{r.motif}</p>
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
    </div>
  );
}
