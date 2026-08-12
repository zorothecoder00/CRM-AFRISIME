"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
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
  const { run, isPending } = useAction(toggleValidationWorkflowActive);

  async function handleChange(next: boolean) {
    setChecked(next);
    const result = await run(workflowId, next);
    if (!result.ok) setChecked(!next);
  }

  return <Switch checked={checked} onCheckedChange={handleChange} disabled={isPending} />;
}
