"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { togglePlaybookActive } from "@/actions/orchestration.actions";
import { Switch } from "@/components/ui/switch";

export function TogglePlaybookButton({ playbookId, isActive }: { playbookId: string; isActive: boolean }) {
  const [checked, setChecked] = useState(isActive);
  const { run, isPending } = useAction(togglePlaybookActive);

  async function handleChange(next: boolean) {
    setChecked(next);
    const result = await run(playbookId, next);
    if (!result.ok) setChecked(!next);
  }

  return <Switch checked={checked} onCheckedChange={handleChange} disabled={isPending} />;
}
