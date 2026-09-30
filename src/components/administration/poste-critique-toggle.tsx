"use client";

import { useAction } from "@/hooks/use-action";
import { setPosteCritique } from "@/actions/poste.actions";
import { Badge } from "@/components/ui/badge";
import { Flag, FlagOff } from "lucide-react";

// Demande utilisateur — rendre evident que l'etiquette est cliquable et
// qu'elle bascule le statut : icone, curseur main, effet de survol, infobulle
// d'action et toast de confirmation.
export function PosteCritiqueToggle({ posteId, critique }: { posteId: string; critique: boolean }) {
  const { run, isPending } = useAction(setPosteCritique, {
    successMessage: critique ? "Statut critique retiré." : "Poste marqué critique.",
  });
  const hint = critique
    ? "Cliquer pour retirer le statut critique de ce poste"
    : "Cliquer pour marquer ce poste comme critique";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => run({ id: posteId, critique: !critique })}
      title={hint}
      aria-label={hint}
      aria-pressed={critique}
      className="group cursor-pointer rounded-4xl transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
    >
      <Badge
        variant={critique ? "destructive" : "outline"}
        className={
          critique
            ? "group-hover:brightness-95"
            : "border-dashed bg-background group-hover:border-destructive group-hover:text-destructive"
        }
      >
        {critique ? (
          <>
            <Flag className="fill-current" />
            {isPending ? "Mise à jour..." : "Poste critique"}
          </>
        ) : (
          <>
            <FlagOff />
            {isPending ? "Mise à jour..." : "Marquer critique"}
          </>
        )}
      </Badge>
    </button>
  );
}
