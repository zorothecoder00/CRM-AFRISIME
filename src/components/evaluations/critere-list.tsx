"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateEvaluationCritere } from "@/actions/evaluation.actions";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type CritereData = {
  id: string;
  libelle: string;
  note: number;
  commentaire: string | null;
};

function CritereRow({ critere, editable }: { critere: CritereData; editable: boolean }) {
  const [note, setNote] = useState(String(critere.note));
  const { run, isPending } = useAction(updateEvaluationCritere, { successMessage: "Critère mis à jour." });

  async function handleSave() {
    await run({ critereId: critere.id, note });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{critere.libelle}</span>
        <span className="text-muted-foreground">{Number(note) || 0} / 5</span>
      </div>
      <ProgressBar value={((Number(note) || 0) / 5) * 100} className="mt-2" />
      {critere.commentaire && <p className="mt-2 text-sm text-muted-foreground">{critere.commentaire}</p>}
      {editable && (
        <div className="mt-2 flex gap-2">
          <Input
            type="number"
            step="0.5"
            min={0}
            max={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 w-24"
          />
          <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
            Mettre à jour
          </Button>
        </div>
      )}
    </div>
  );
}

export function CritereList({ criteres, editable }: { criteres: CritereData[]; editable: boolean }) {
  if (criteres.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun critère noté pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {criteres.map((critere) => (
        <CritereRow key={critere.id} critere={critere} editable={editable} />
      ))}
    </div>
  );
}
