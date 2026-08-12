"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { acknowledgeEvaluation } from "@/actions/evaluation.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCheck } from "lucide-react";

export function AcknowledgeEvaluationForm({ evaluationId }: { evaluationId: string }) {
  const [commentaireEvalue, setCommentaireEvalue] = useState("");
  const { run, isPending } = useAction(acknowledgeEvaluation, {
    successMessage: "Accusé de réception enregistré.",
  });

  async function handleAcknowledge() {
    await run({ evaluationId, commentaireEvalue: commentaireEvalue.trim() || undefined });
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm text-muted-foreground">
        Cette évaluation vous a été soumise. Vous pouvez y ajouter un commentaire avant d&apos;en accuser
        réception.
      </p>
      <Textarea
        placeholder="Votre commentaire (optionnel)"
        value={commentaireEvalue}
        onChange={(e) => setCommentaireEvalue(e.target.value)}
        rows={3}
      />
      <Button size="sm" onClick={handleAcknowledge} disabled={isPending}>
        <CheckCheck className="mr-1 h-4 w-4" />
        {isPending ? "Envoi..." : "Accuser réception"}
      </Button>
    </div>
  );
}
