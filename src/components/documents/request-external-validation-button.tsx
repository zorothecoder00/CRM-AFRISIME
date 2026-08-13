"use client";

import { useAction } from "@/hooks/use-action";
import { requestExternalValidation } from "@/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function RequestExternalValidationButton({ documentId }: { documentId: string }) {
  const { run, isPending } = useAction(requestExternalValidation, {
    successMessage: "Demande de validation envoyée au partenaire.",
  });

  return (
    <Button variant="outline" size="sm" onClick={() => run(documentId)} disabled={isPending}>
      <Send className="mr-1 h-4 w-4" />
      Demander la validation du client
    </Button>
  );
}
