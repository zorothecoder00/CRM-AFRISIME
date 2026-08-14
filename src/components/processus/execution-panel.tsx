"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { startExecution, advanceExecution, closeExecution } from "@/actions/processus.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Etape = { id: string; nom: string };

export type ExecutionData = {
  id: string;
  libelle: string;
  statut: string;
  etapeActuelleId: string | null;
  etapeActuelleNom: string | null;
  dateDebut: string;
};

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  REJETE: "Rejeté",
  ANNULE: "Annulé",
};

function ExecutionRow({ execution, etapes, canManage }: { execution: ExecutionData; etapes: Etape[]; canManage: boolean }) {
  const [nextEtapeId, setNextEtapeId] = useState<string | undefined>();
  const { run: advance, isPending: advancing } = useAction(advanceExecution, { successMessage: "Dossier avancé." });
  const { run: close, isPending: closing } = useAction(closeExecution, { successMessage: "Dossier clôturé." });

  const currentIndex = etapes.findIndex((e) => e.id === execution.etapeActuelleId);
  const nextEtapes = currentIndex >= 0 ? etapes.slice(currentIndex + 1) : etapes;

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{execution.libelle}</p>
          <p className="text-xs text-muted-foreground">
            {execution.etapeActuelleNom ?? "—"} · démarré le{" "}
            {new Date(execution.dateDebut).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <Badge variant={toneForStatus(execution.statut)}>{STATUT_LABELS[execution.statut]}</Badge>
      </div>
      {canManage && execution.statut === "EN_COURS" && (
        <div className="flex flex-wrap items-center gap-2">
          {nextEtapes.length > 0 && (
            <>
              <Select value={nextEtapeId} onValueChange={setNextEtapeId}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder="Étape suivante" />
                </SelectTrigger>
                <SelectContent>
                  {nextEtapes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!nextEtapeId || advancing}
                onClick={() => nextEtapeId && advance(execution.id, nextEtapeId)}
              >
                Avancer
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" disabled={closing} onClick={() => close(execution.id, "TERMINE")}>
            Terminer
          </Button>
          <Button size="sm" variant="outline" disabled={closing} onClick={() => close(execution.id, "REJETE")}>
            Rejeter
          </Button>
          <Button size="sm" variant="ghost" disabled={closing} onClick={() => close(execution.id, "ANNULE")}>
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}

export function ExecutionPanel({
  processusId,
  executions,
  etapes,
  canManage,
}: {
  processusId: string;
  executions: ExecutionData[];
  etapes: Etape[];
  canManage: boolean;
}) {
  const [libelle, setLibelle] = useState("");
  const { run: start, isPending } = useAction(startExecution, { successMessage: "Dossier démarré." });

  async function handleStart() {
    if (!libelle.trim()) return;
    const result = await start({ processusId, libelle: libelle.trim() });
    if (result.ok) setLibelle("");
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex gap-2">
          <Input placeholder="Libellé du nouveau dossier" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          <Button size="sm" onClick={handleStart} disabled={isPending || !libelle.trim()}>
            {isPending ? "Démarrage..." : "Démarrer"}
          </Button>
        </div>
      )}
      {executions.map((exec) => (
        <ExecutionRow key={exec.id} execution={exec} etapes={etapes} canManage={canManage} />
      ))}
      {executions.length === 0 && <p className="text-sm text-muted-foreground">Aucun dossier en cours.</p>}
    </div>
  );
}
