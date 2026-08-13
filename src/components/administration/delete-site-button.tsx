"use client";

import { useAction } from "@/hooks/use-action";
import { deleteSite } from "@/actions/site.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteSiteButton({ id }: { id: string }) {
  const { run, isPending } = useAction(deleteSite, { successMessage: "Site supprimé." });

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
