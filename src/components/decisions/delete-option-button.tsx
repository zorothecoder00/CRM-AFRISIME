"use client";

import { useAction } from "@/hooks/use-action";
import { deleteDecisionOption } from "@/actions/decision-matrix.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteOptionButton({ optionId, matrixId }: { optionId: string; matrixId: string }) {
  const { run, isPending } = useAction(deleteDecisionOption, { successMessage: "Option supprimée." });
  return (
    <Button variant="ghost" size="sm" disabled={isPending} onClick={() => run(optionId, matrixId)}>
      <Trash2 className="size-3.5" />
    </Button>
  );
}
