"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateMeetingRsvp } from "@/actions/portal.actions";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function PortalMeetingRsvp({ participantId }: { participantId: string }) {
  const [decided, setDecided] = useState(false);
  const { run, isPending } = useAction(updateMeetingRsvp, { successMessage: "Réponse enregistrée." });

  async function respond(rsvp: "CONFIRME" | "DECLINE") {
    const result = await run({ participantId, rsvp });
    if (result.ok) setDecided(true);
  }

  if (decided) return <p className="text-sm text-muted-foreground">Réponse enregistrée.</p>;

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => respond("CONFIRME")}>
        <Check className="mr-1 h-4 w-4" />
        Confirmer
      </Button>
      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => respond("DECLINE")}>
        <X className="mr-1 h-4 w-4" />
        Décliner
      </Button>
    </div>
  );
}
