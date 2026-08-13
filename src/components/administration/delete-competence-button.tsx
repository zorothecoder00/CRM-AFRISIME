"use client";

import { useAction } from "@/hooks/use-action";
import { deleteCompetence } from "@/actions/competence.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteCompetenceButton({ id }: { id: string }) {
  const { run, isPending } = useAction(deleteCompetence, { successMessage: "Compétence supprimée." });

  return (
    <Button
      onClick={() => run(id)}
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
