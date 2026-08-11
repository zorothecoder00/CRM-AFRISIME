"use client";

import { useState } from "react";
import { toast } from "sonner";
import { submitForValidation, validateTask } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Check, X } from "lucide-react";

type StepRow = {
  ordre: number;
  label: string;
  statut: "EN_ATTENTE" | "APPROUVE" | "REJETE";
  approverName: string | null;
  isCurrent: boolean;
};

const STEP_BADGE: Record<StepRow["statut"], { label: string; variant: "secondary" | "default" | "destructive" }> = {
  EN_ATTENTE: { label: "En attente", variant: "secondary" },
  APPROUVE: { label: "Approuvé", variant: "default" },
  REJETE: { label: "Refusé", variant: "destructive" },
};

export function ValidationActions({
  taskId,
  statut,
  isResponsable,
  hasValidatePermission,
  isCurrentApprover,
  steps,
}: {
  taskId: string;
  statut: string;
  isResponsable: boolean;
  hasValidatePermission: boolean;
  isCurrentApprover: boolean;
  steps: StepRow[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentaire, setCommentaire] = useState("");

  async function handleSubmitForValidation() {
    setIsSubmitting(true);
    try {
      await submitForValidation(taskId);
      toast.success("Tâche soumise pour validation.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleValidate(approved: boolean) {
    setIsSubmitting(true);
    try {
      await validateTask(taskId, approved, commentaire.trim() || undefined);
      setCommentaire("");
      toast.success(approved ? "Étape approuvée." : "Tâche refusée et renvoyée au créateur.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = isResponsable && !["EN_REVISION", "TERMINEE", "ANNULEE"].includes(statut);

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

  if (statut === "EN_REVISION" && hasValidatePermission && isCurrentApprover) {
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
          <Button size="sm" onClick={() => handleValidate(true)} disabled={isSubmitting}>
            <Check className="mr-1 h-4 w-4" />
            Approuver
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleValidate(false)} disabled={isSubmitting}>
            <X className="mr-1 h-4 w-4" />
            Refuser
          </Button>
        </div>
      </div>
    );
  }

  if (statut === "EN_REVISION") {
    return (
      <div>
        {stepList}
        <p className="text-sm text-muted-foreground">En attente de validation.</p>
      </div>
    );
  }

  if (canSubmit) {
    return (
      <Button size="sm" variant="outline" onClick={handleSubmitForValidation} disabled={isSubmitting}>
        <Send className="mr-1 h-4 w-4" />
        Soumettre pour validation
      </Button>
    );
  }

  return null;
}
