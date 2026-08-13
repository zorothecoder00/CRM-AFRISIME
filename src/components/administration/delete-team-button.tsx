"use client";

import { useAction } from "@/hooks/use-action";
import { deleteTeam } from "@/actions/team.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteTeamButton({ id }: { id: string }) {
  const { run, isPending } = useAction(deleteTeam, { successMessage: "Équipe supprimée." });

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
