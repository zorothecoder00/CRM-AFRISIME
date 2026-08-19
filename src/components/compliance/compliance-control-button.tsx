"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { addComplianceControl } from "@/actions/compliance.actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export function ComplianceControlButtons({ obligationId }: { obligationId: string }) {
  const router = useRouter();
  const [pendingResultat, setPendingResultat] = useState<"CONFORME" | "NON_CONFORME" | null>(null);
  const { run, isPending } = useAction(addComplianceControl, { successMessage: "Contrôle enregistré." });

  async function handleClick(resultat: "CONFORME" | "NON_CONFORME") {
    setPendingResultat(resultat);
    const result = await run({ obligationId, resultat });
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleClick("CONFORME")}
        disabled={isPending}
      >
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {isPending && pendingResultat === "CONFORME" ? "..." : "Conforme"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleClick("NON_CONFORME")}
        disabled={isPending}
      >
        <XCircle className="mr-1 h-3.5 w-3.5" /> {isPending && pendingResultat === "NON_CONFORME" ? "..." : "Non conforme"}
      </Button>
    </div>
  );
}
