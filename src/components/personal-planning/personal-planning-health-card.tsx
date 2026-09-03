"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gauge } from "lucide-react";
import type { PlanningHealthCriterion } from "@/lib/personal-planning-workload";

function toneFor(score: number) {
  return score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
}
function barToneFor(score: number) {
  return score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive";
}
/** Seuil au-delà duquel on peut parler d'un planning "équilibré" — repère visuel fixe sur la barre, indépendant du score lui-même. */
const EQUILIBRE_THRESHOLD = 75;

/**
 * Widget "Planning Health" du hub (§43) — cliquer ouvre le détail des 7
 * sous-scores (cahier de corrections UI/UX §9 : "l'utilisateur doit
 * comprendre pourquoi son score est de 53", pas juste voir un total isolé).
 */
export function PersonalPlanningHealthCard({ score, criteria }: { score: number; criteria: PlanningHealthCriterion[] }) {
  const [open, setOpen] = useState(false);
  const tone = toneFor(score);
  const barTone = barToneFor(score);

  return (
    <>
      <Card id="planning-health">
        <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
          <CardHeader className="flex flex-row items-center gap-2 border-b">
            <Gauge className={`size-5 ${tone}`} />
            <CardTitle className="text-base">Planning Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={`text-2xl font-bold ${tone}`}>
              {score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </p>
            {/* Repère "équilibre" (demande utilisateur) — pas le score lui-même :
                un seuil fixe à 75%, au-delà duquel on considère le planning
                équilibré. Légende au-dessus de la barre (pas en dessous),
                elle-même sous la note. */}
            <span className="block text-[10px] text-muted-foreground">Équilibre</span>
            <div className="relative">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${barTone}`} style={{ width: `${score}%` }} />
              </div>
              <div className="absolute top-0 h-2 w-px bg-foreground/40" style={{ left: `${EQUILIBRE_THRESHOLD}%` }} />
            </div>
            <p className="text-xs text-primary hover:underline">Voir le détail des 7 critères →</p>
          </CardContent>
        </button>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className={`size-5 ${tone}`} />
              Planning Health — {score}/100
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {criteria.map((c) => (
              <div key={c.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <span className={`font-medium ${toneFor(c.score)}`}>{c.score}/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${barToneFor(c.score)}`} style={{ width: `${c.score}%` }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Moyenne non pondérée des 7 critères ci-dessus — chacun compte pour 1/7 du score total.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
