"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { approveAiAction, rejectAiAction } from "@/actions/ai-governance.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Human in the loop (cahier des charges V2.2 §43) — approuver exécute réellement l'action différée, rejeter ne fait rien. */
export function PendingActionActions({ id }: { id: string }) {
  const [showReject, setShowReject] = useState(false);
  const [motif, setMotif] = useState("");
  const approve = useAction(approveAiAction, { successMessage: "Action approuvée et exécutée." });
  const reject = useAction(rejectAiAction, { successMessage: "Action rejetée." });

  if (showReject) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif (facultatif)"
          className="h-8 w-40"
        />
        <Button size="sm" variant="destructive" disabled={reject.isPending} onClick={() => reject.run(id, motif || undefined)}>
          Confirmer
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={approve.isPending} onClick={() => approve.run(id)}>
        Approuver
      </Button>
      <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
        Rejeter
      </Button>
    </div>
  );
}
