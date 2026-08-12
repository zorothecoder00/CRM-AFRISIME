"use client";

import { useAction } from "@/hooks/use-action";
import { linkProjectToProgramme } from "@/actions/programme.actions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function UnlinkProjectButton({ projectId }: { projectId: string }) {
  const { run, isPending } = useAction(linkProjectToProgramme, {
    successMessage: "Projet détaché du programme.",
  });

  async function handleUnlink() {
    await run({ projectId });
  }

  return (
    <Button
      onClick={handleUnlink}
      disabled={isPending}
      variant="ghost"
      size="icon-sm"
      aria-label="Détacher du programme"
      title="Détacher du programme"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
