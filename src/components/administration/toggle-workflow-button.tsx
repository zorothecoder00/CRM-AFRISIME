"use client";

import { useState } from "react";
import { toast } from "sonner";
import { toggleValidationWorkflowActive } from "@/actions/validation-workflow.actions";
import { Switch } from "@/components/ui/switch";

export function ToggleWorkflowButton({
  workflowId,
  isActive,
}: {
  workflowId: string;
  isActive: boolean;
}) {
  const [checked, setChecked] = useState(isActive);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleChange(next: boolean) {
    setChecked(next);
    setIsSubmitting(true);
    try {
      await toggleValidationWorkflowActive(workflowId, next);
    } catch (err) {
      setChecked(!next);
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <Switch checked={checked} onCheckedChange={handleChange} disabled={isSubmitting} />;
}
