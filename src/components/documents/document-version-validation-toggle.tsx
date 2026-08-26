"use client";

import { useAction } from "@/hooks/use-action";
import { setDocumentVersionValidation } from "@/actions/document.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck } from "lucide-react";

export type DocumentVersionValidationData = {
  valide: boolean;
  valideurName: string | null;
  valideLe: string | null;
};

/** Project Studio §39 (Version Control) — validation interne par version. */
export function DocumentVersionValidationToggle({
  versionId,
  validation,
  canManage,
}: {
  versionId: string;
  validation: DocumentVersionValidationData;
  canManage: boolean;
}) {
  const { run, isPending } = useAction(setDocumentVersionValidation, { successMessage: "Validation mise à jour." });

  if (validation.valide) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="success">
          <BadgeCheck className="mr-1 h-3 w-3" />
          Validée{validation.valideurName ? ` par ${validation.valideurName}` : ""}
          {validation.valideLe ? ` le ${new Date(validation.valideLe).toLocaleDateString("fr-FR")}` : ""}
        </Badge>
        {canManage && (
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" disabled={isPending} onClick={() => run({ versionId, valide: false })}>
            Annuler
          </Button>
        )}
      </div>
    );
  }

  if (!canManage) return <Badge variant="outline">Non validée</Badge>;

  return (
    <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={isPending} onClick={() => run({ versionId, valide: true })}>
      Valider cette version
    </Button>
  );
}
