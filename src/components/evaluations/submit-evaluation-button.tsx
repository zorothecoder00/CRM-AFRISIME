"use client";

import { useAction } from "@/hooks/use-action";
import { submitEvaluation } from "@/actions/evaluation.actions";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function SubmitEvaluationButton({ evaluationId }: { evaluationId: string }) {
  const { run, isPending } = useAction(submitEvaluation, {
    successMessage: "Évaluation soumise à l'évalué.",
  });

  async function handleSubmit() {
    await run(evaluationId);
  }

  return (
    <Button size="sm" onClick={handleSubmit} disabled={isPending}>
      <Send className="mr-1 h-4 w-4" />
      {isPending ? "Envoi..." : "Soumettre l'évaluation"}
    </Button>
  );
}
