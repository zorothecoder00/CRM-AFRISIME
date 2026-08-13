"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { reviewPortalDeliverable } from "@/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";

export function PortalDeliverableReview({ documentId }: { documentId: string }) {
  const [showReject, setShowReject] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const { run, isPending } = useAction(reviewPortalDeliverable);

  if (showReject) {
    return (
      <div className="space-y-2">
        <Textarea
          placeholder="Motif du rejet (optionnel)"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => run({ documentId, decision: "REJETE", commentaire: commentaire.trim() || undefined })}
          >
            Confirmer le rejet
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowReject(false)} disabled={isPending}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => run({ documentId, decision: "VALIDE" })}>
        <Check className="mr-1 h-4 w-4" />
        Valider
      </Button>
      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => setShowReject(true)}>
        <X className="mr-1 h-4 w-4" />
        Rejeter
      </Button>
    </div>
  );
}
