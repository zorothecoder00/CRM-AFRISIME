"use client";

import { useAction } from "@/hooks/use-action";
import { triggerRiskAlert } from "@/actions/risk.actions";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";

export function TriggerAlertButton({ riskId }: { riskId: string }) {
  const { run, isPending } = useAction(triggerRiskAlert, { successMessage: "Alerte envoyée aux parties prenantes." });

  return (
    <Button variant="outline" size="sm" onClick={() => run(riskId)} disabled={isPending}>
      <BellRing className="mr-2 h-4 w-4" />
      {isPending ? "Envoi..." : "Déclencher une alerte"}
    </Button>
  );
}
