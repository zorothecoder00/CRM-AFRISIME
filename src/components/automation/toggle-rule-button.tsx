"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { toggleRuleActive } from "@/actions/automation.actions";
import { Switch } from "@/components/ui/switch";

export function ToggleRuleButton({ ruleId, isActive }: { ruleId: string; isActive: boolean }) {
  const [checked, setChecked] = useState(isActive);
  const { run, isPending } = useAction(toggleRuleActive);

  async function handleChange(next: boolean) {
    setChecked(next);
    const result = await run(ruleId, next);
    if (!result.ok) setChecked(!next);
  }

  return <Switch checked={checked} onCheckedChange={handleChange} disabled={isPending} />;
}
