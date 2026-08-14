"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateProcessusStatut, createProcessusVersion } from "@/actions/processus.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  ARCHIVE: "Archivé",
};

export function ProcessusStatutForm({ processusId, statut }: { processusId: string; statut: string }) {
  const [note, setNote] = useState("");
  const { run: updateStatut } = useAction(updateProcessusStatut, { successMessage: "Statut mis à jour." });
  const { run: newVersion, isPending: creatingVersion } = useAction(createProcessusVersion, {
    successMessage: "Nouvelle version enregistrée.",
  });

  async function handleNewVersion() {
    const result = await newVersion(processusId, note.trim() || undefined);
    if (result.ok) setNote("");
  }

  return (
    <div className="space-y-3">
      <Select value={statut} onValueChange={(v) => updateStatut(processusId, v as "BROUILLON" | "ACTIF" | "ARCHIVE")}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="space-y-2">
        <Input placeholder="Note de version (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" className="w-full" onClick={handleNewVersion} disabled={creatingVersion}>
          {creatingVersion ? "Enregistrement..." : "Enregistrer une nouvelle version"}
        </Button>
      </div>
    </div>
  );
}
