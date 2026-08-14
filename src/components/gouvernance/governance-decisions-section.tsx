"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addGovernanceDecision, updateGovernanceDecisionStatus } from "@/actions/gouvernance.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toneForPriority } from "@/lib/status-tone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; label: string };

export type GovernanceDecisionData = {
  id: string;
  reference: string | null;
  objet: string;
  contexte: string | null;
  decision: string;
  statut: string;
  priorite: string;
  responsableName: string | null;
  echeance: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  TRAITEE: "Traitée",
  ANNULEE: "Annulée",
};

const PRIORITE_LABELS: Record<string, string> = {
  BASSE: "Basse",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  CRITIQUE: "Critique",
};

function DecisionStatusSelect({ decisionId, statut }: { decisionId: string; statut: string }) {
  const { run } = useAction(updateGovernanceDecisionStatus, { successMessage: "Statut mis à jour." });
  return (
    <Select value={statut} onValueChange={(v) => run(decisionId, v as "EN_COURS" | "TRAITEE" | "ANNULEE")}>
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

export function GovernanceDecisionsSection({
  meetingId,
  decisions,
  users,
}: {
  meetingId: string;
  decisions: GovernanceDecisionData[];
  users: Option[];
}) {
  const [objet, setObjet] = useState("");
  const [contexte, setContexte] = useState("");
  const [decision, setDecision] = useState("");
  const [responsableId, setResponsableId] = useState<string | undefined>();
  const [echeance, setEcheance] = useState("");
  const [priorite, setPriorite] = useState<"BASSE" | "MOYENNE" | "HAUTE" | "CRITIQUE">("MOYENNE");
  const { run, isPending } = useAction(addGovernanceDecision, { successMessage: "Décision ajoutée." });

  async function handleAdd() {
    if (!objet.trim() || !decision.trim() || !responsableId) return;
    const result = await run({
      meetingId,
      objet: objet.trim(),
      contexte: contexte.trim() || undefined,
      decision: decision.trim(),
      responsableId,
      echeance: echeance || undefined,
      priorite,
    });
    if (result.ok) {
      setObjet("");
      setContexte("");
      setDecision("");
      setResponsableId(undefined);
      setEcheance("");
      setPriorite("MOYENNE");
    }
  }

  return (
    <div className="space-y-3">
      {decisions.map((d) => (
        <div key={d.id} className="rounded-md border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{d.objet}</p>
            <div className="flex items-center gap-2">
              <Badge variant={toneForPriority(d.priorite)}>{PRIORITE_LABELS[d.priorite]}</Badge>
              <DecisionStatusSelect decisionId={d.id} statut={d.statut} />
            </div>
          </div>
          {d.contexte && <p className="mt-1 text-xs text-muted-foreground">Contexte : {d.contexte}</p>}
          <p className="mt-1 text-sm">{d.decision}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {d.responsableName && <span>Responsable : {d.responsableName}</span>}
            {d.echeance && <span>Échéance : {new Date(d.echeance).toLocaleDateString("fr-FR")}</span>}
          </div>
        </div>
      ))}
      {decisions.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune décision enregistrée.</p>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <Input placeholder="Objet de la décision" value={objet} onChange={(e) => setObjet(e.target.value)} />
        <Textarea placeholder="Contexte (optionnel)" value={contexte} onChange={(e) => setContexte(e.target.value)} rows={2} />
        <Textarea placeholder="Décision prise" value={decision} onChange={(e) => setDecision(e.target.value)} rows={2} />
        <div className="grid grid-cols-3 gap-2">
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
          <Select value={priorite} onValueChange={(v) => setPriorite(v as typeof priorite)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !objet.trim() || !decision.trim() || !responsableId}
        >
          {isPending ? "Ajout..." : "Ajouter la décision"}
        </Button>
      </div>
    </div>
  );
}
