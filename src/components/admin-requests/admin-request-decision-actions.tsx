"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { decideAdminRequest } from "@/actions/admin-request.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

type StepRow = {
  ordre: number;
  label: string;
  statut: "EN_ATTENTE" | "APPROUVE" | "REJETE";
  approverName: string | null;
  isCurrent: boolean;
};

const STEP_BADGE: Record<StepRow["statut"], { label: string; variant: "secondary" | "success" | "destructive" }> = {
  EN_ATTENTE: { label: "En attente", variant: "secondary" },
  APPROUVE: { label: "Approuvé", variant: "success" },
  REJETE: { label: "Refusé", variant: "destructive" },
};

export function AdminRequestDecisionActions({
  requestId,
  statut,
  isCurrentApprover,
  steps,
}: {
  requestId: string;
  statut: string;
  isCurrentApprover: boolean;
  steps: StepRow[];
}) {
  const [commentaire, setCommentaire] = useState("");
  const { run, isPending } = useAction(decideAdminRequest);

  async function handleDecide(approved: boolean) {
    const result = await run(requestId, approved, commentaire.trim() || undefined);
    if (result.ok) setCommentaire("");
  }

  const stepList = steps.length > 0 && (
    <ol className="mb-3 space-y-1.5">
      {steps.map((step) => (
        <li
          key={step.ordre}
          className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm ${
            step.isCurrent ? "border-primary" : ""
          }`}
        >
          <span>
            {step.ordre}. {step.label}
            {step.approverName && <span className="text-muted-foreground"> — {step.approverName}</span>}
          </span>
          <Badge variant={STEP_BADGE[step.statut].variant}>{STEP_BADGE[step.statut].label}</Badge>
        </li>
      ))}
    </ol>
  );

  if (statut !== "EN_ATTENTE") {
    return stepList || null;
  }

  if (!isCurrentApprover) {
    return (
      <div>
        {stepList}
        <p className="text-sm text-muted-foreground">En attente de validation.</p>
      </div>
    );
  }

  return (
    <div>
      {stepList}
      <Textarea
        placeholder="Commentaire (optionnel)"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        className="mb-2"
        rows={2}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => handleDecide(true)} disabled={isPending}>
          <Check className="mr-1 h-4 w-4" />
          Approuver
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleDecide(false)} disabled={isPending}>
          <X className="mr-1 h-4 w-4" />
          Refuser
        </Button>
      </div>
    </div>
  );
}
