"use client";

import { useAction } from "@/hooks/use-action";
import { deleteAppCatalogEntry } from "@/actions/app-catalog.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteAppCatalogEntryButton({ id, nom }: { id: string; nom: string }) {
  const { run, isPending } = useAction(deleteAppCatalogEntry, { successMessage: "Application supprimée du catalogue." });

  return (
    <Button
      onClick={() => {
        if (!confirm(`Supprimer « ${nom} » du catalogue ?`)) return;
        run({ id });
      }}
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
