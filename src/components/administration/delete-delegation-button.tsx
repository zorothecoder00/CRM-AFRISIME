"use client";

import { useAction } from "@/hooks/use-action";
import { deleteDelegation } from "@/actions/delegation.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteDelegationButton({ id }: { id: string }) {
  const { run, isPending } = useAction(deleteDelegation, { successMessage: "Délégation supprimée." });

  return (
    <Button
      onClick={() => run({ id })}
      disabled={isPending}
      variant="ghost"
      size="icon-sm"
      aria-label="Supprimer"
      title="Supprimer"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
