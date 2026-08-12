"use client";

import { useAction } from "@/hooks/use-action";
import { linkObjectiveToPlan, linkProgrammeToPlan } from "@/actions/plan.actions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function UnlinkObjectiveButton({ objectiveId }: { objectiveId: string }) {
  const { run, isPending } = useAction(linkObjectiveToPlan, { successMessage: "Objectif détaché du plan." });

  async function handleUnlink() {
    await run({ objectiveId });
  }

  return (
    <Button
      onClick={handleUnlink}
      disabled={isPending}
      variant="ghost"
      size="icon-sm"
      aria-label="Détacher du plan"
      title="Détacher du plan"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}

export function UnlinkProgrammeButton({ programmeId }: { programmeId: string }) {
  const { run, isPending } = useAction(linkProgrammeToPlan, { successMessage: "Programme détaché du plan." });

  async function handleUnlink() {
    await run({ programmeId });
  }

  return (
    <Button
      onClick={handleUnlink}
      disabled={isPending}
      variant="ghost"
      size="icon-sm"
      aria-label="Détacher du plan"
      title="Détacher du plan"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
