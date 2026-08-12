"use client";

import { useAction } from "@/hooks/use-action";
import { linkCourrierTask } from "@/actions/courrier.actions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function UnlinkTaskButton({ courrierId }: { courrierId: string }) {
  const { run, isPending } = useAction(linkCourrierTask, { successMessage: "Tâche détachée." });

  async function handleUnlink() {
    await run({ courrierId });
  }

  return (
    <Button
      onClick={handleUnlink}
      disabled={isPending}
      variant="ghost"
      size="icon-sm"
      aria-label="Détacher la tâche"
      title="Détacher la tâche"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
