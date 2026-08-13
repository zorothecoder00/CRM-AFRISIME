"use client";

import { useAction } from "@/hooks/use-action";
import { deletePermissionOverride } from "@/actions/permission-override.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeletePermissionOverrideButton({ overrideId }: { overrideId: string }) {
  const { run, isPending } = useAction(deletePermissionOverride, { successMessage: "Dérogation supprimée." });

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => run(overrideId)}
      disabled={isPending}
      aria-label="Supprimer la dérogation"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
