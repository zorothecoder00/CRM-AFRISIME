"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { deleteTeam, getTeamImpactAnalysis } from "@/actions/team.actions";
import type { ImpactAnalysis } from "@/lib/impact-analysis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toneForCriticite, toneForNiveau } from "@/lib/status-tone";
import { Trash2, Loader2 } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

// V3.0 §6 — Analyse d'impact avant une modification importante : l'exemple
// detaille par le cahier ("la direction souhaite supprimer une equipe") est
// applique ici, en amont de la suppression deja en place.
export function DeleteTeamButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null);
  const { run: loadAnalysis, isPending: isAnalyzing } = useAction(getTeamImpactAnalysis);
  const { run: runDelete, isPending: isDeleting } = useAction(deleteTeam, { successMessage: "Équipe supprimée." });

  async function handleOpen() {
    setOpen(true);
    setAnalysis(null);
    const result = await loadAnalysis(id);
    if (result.ok) setAnalysis(result.data);
    else setOpen(false);
  }

  async function handleConfirm() {
    const result = await runDelete(id);
    if (result.ok) setOpen(false);
  }

  return (
    <>
      <Button onClick={handleOpen} variant="ghost" size="icon-sm" aria-label="Supprimer" title="Supprimer">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Analyse d&apos;impact — suppression de l&apos;équipe</DialogTitle>
          </DialogHeader>

          {isAnalyzing || !analysis ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Impact estimé :</span>
                <Badge variant={toneForNiveau(analysis.level)}>{LEVEL_LABELS[analysis.level]}</Badge>
              </div>

              <ul className="space-y-1.5 text-sm">
                {analysis.consequences.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>

              {analysis.risques.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Risques ouverts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.risques.map((r) => (
                      <Badge key={r.id} variant={toneForCriticite(r.criticite)}>
                        {r.titre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.dependances.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Dépendances enregistrées</p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {analysis.dependances.map((d, i) => (
                      <li key={i}>
                        {d.direction === "amont" ? "dépend de cette équipe" : "cette équipe dépend de"} — {d.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isAnalyzing || !analysis || isDeleting}>
              {isDeleting ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
