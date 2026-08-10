"use client";

import { useState } from "react";
import { toast } from "sonner";
import { submitForValidation, validateTask } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { Send, Check, X } from "lucide-react";

export function ValidationActions({
  taskId,
  statut,
  isResponsable,
  canValidate,
}: {
  taskId: string;
  statut: string;
  isResponsable: boolean;
  canValidate: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await validateTask(taskId, approved);
      toast.success(approved ? "Tâche approuvée." : "Tâche refusée et renvoyée au créateur.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = isResponsable && !["EN_REVISION", "TERMINEE", "ANNULEE"].includes(statut);

  if (statut === "EN_REVISION" && canValidate) {
    return (
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
    );
  }

  if (statut === "EN_REVISION") {
    return <p className="text-sm text-muted-foreground">En attente de validation.</p>;
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
