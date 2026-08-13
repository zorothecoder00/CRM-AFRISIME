"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { addDecision, updateDecisionStatus } from "@/actions/meeting.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; label: string };

export type DecisionData = {
  id: string;
  description: string;
  motif: string | null;
  statut: string;
  responsableName: string | null;
  echeance: string | null;
  taskId: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  TRAITEE: "Traitée",
  ANNULEE: "Annulée",
};

function DecisionStatusSelect({ decisionId, statut }: { decisionId: string; statut: string }) {
  const { run } = useAction(updateDecisionStatus, { successMessage: "Statut mis à jour." });
  return (
    <Select value={statut} onValueChange={(v) => run({ decisionId, statut: v as "EN_COURS" | "TRAITEE" | "ANNULEE" })}>
      <SelectTrigger className="h-7 w-32 text-xs">
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
  );
}

export function DecisionsSection({
  meetingId,
  decisions,
  users,
}: {
  meetingId: string;
  decisions: DecisionData[];
  users: Option[];
}) {
  const [description, setDescription] = useState("");
  const [motif, setMotif] = useState("");
  const [responsableId, setResponsableId] = useState<string | undefined>();
  const [echeance, setEcheance] = useState("");
  const { run, isPending } = useAction(addDecision, {
    successMessage: "Décision ajoutée, tâche créée automatiquement.",
  });

  async function handleAdd() {
    if (!description.trim() || !responsableId) return;
    const result = await run({
      meetingId,
      description: description.trim(),
      motif: motif.trim() || undefined,
      responsableId,
      echeance: echeance || undefined,
    });
    if (result.ok) {
      setDescription("");
      setMotif("");
      setResponsableId(undefined);
      setEcheance("");
    }
  }

  return (
    <div className="space-y-3">
      {decisions.map((d) => (
        <div key={d.id} className="rounded-md border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{d.description}</p>
            <DecisionStatusSelect decisionId={d.id} statut={d.statut} />
          </div>
          {d.motif && <p className="mt-1 text-xs text-muted-foreground">Motif : {d.motif}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {d.responsableName && <span>Responsable : {d.responsableName}</span>}
            {d.echeance && <span>Échéance : {new Date(d.echeance).toLocaleDateString("fr-FR")}</span>}
            {d.taskId && (
              <Link href={`/taches/${d.taskId}`}>
                <Badge variant="secondary">Tâche créée</Badge>
              </Link>
            )}
          </div>
        </div>
      ))}
      {decisions.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune décision enregistrée.</p>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <Input
          placeholder="Décision / action à réaliser..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input placeholder="Motif (optionnel)" value={motif} onChange={(e) => setMotif(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={responsableId} onValueChange={setResponsableId}>
            <SelectTrigger>
              <SelectValue placeholder="Responsable (requis)" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Une tâche est automatiquement créée et assignée au responsable choisi.
        </p>
        <Button size="sm" onClick={handleAdd} disabled={isPending || !description.trim() || !responsableId}>
          {isPending ? "Ajout..." : "Ajouter la décision"}
        </Button>
      </div>
    </div>
  );
}
