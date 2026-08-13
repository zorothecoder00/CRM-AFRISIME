"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateDocumentSignature } from "@/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS: Record<string, string> = {
  NON_REQUISE: "Non requise",
  EN_ATTENTE: "En attente",
  SIGNE: "Signé",
  REFUSE: "Refusé",
};

export function DocumentSignatureForm({
  documentId,
  initialStatut,
  initialDateSignature,
}: {
  documentId: string;
  initialStatut: string;
  initialDateSignature: string | null;
}) {
  const [statut, setStatut] = useState(initialStatut);
  const [dateSignature, setDateSignature] = useState(initialDateSignature ?? "");
  const { run: submit, isPending } = useAction(updateDocumentSignature, {
    successMessage: "Statut de signature mis à jour.",
  });

  async function handleSave() {
    await submit({
      documentId,
      statutSignature: statut as "NON_REQUISE" | "EN_ATTENTE" | "SIGNE" | "REFUSE",
      dateSignature: statut === "SIGNE" ? dateSignature || undefined : undefined,
    });
  }

  return (
    <div className="space-y-2">
      <Label>Statut de signature</Label>
      <Select value={statut} onValueChange={setStatut}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {statut === "SIGNE" && (
        <Input
          type="date"
          value={dateSignature}
          onChange={(e) => setDateSignature(e.target.value)}
        />
      )}
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
