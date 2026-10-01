"use client";

import { useAction } from "@/hooks/use-action";
import { deleteDependency } from "@/actions/dependency.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Trash2 } from "lucide-react";

export type DependencyRow = {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  type: string;
  atRisk: boolean;
  riskMessage: string | null;
};

export function DependencyList({
  dependencies,
  canManage,
  accentBars = true,
}: {
  dependencies: DependencyRow[];
  canManage: boolean;
  /** false : sans barre d'accent (demande utilisateur sur /projets/[id]). */
  accentBars?: boolean;
}) {
  if (dependencies.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune dépendance enregistrée.</p>;
  }

  return (
    <div className="space-y-3">
      {dependencies.map((dep) => (
        <DependencyCard key={dep.id} dependency={dep} canManage={canManage} accentBars={accentBars} />
      ))}
    </div>
  );
}

function DependencyCard({
  dependency,
  canManage,
  accentBars,
}: {
  dependency: DependencyRow;
  canManage: boolean;
  accentBars: boolean;
}) {
  const { run, isPending } = useAction(deleteDependency, { successMessage: "Dépendance supprimée." });

  return (
    // Sans barre d'accent, une dependance a risque garde son signal en fond rouge.
    <Card
      accent={accentBars && dependency.atRisk ? "destructive" : "none"}
      className={!accentBars && dependency.atRisk ? "bg-destructive/10" : undefined}
    >
      <CardContent className="space-y-2 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{dependency.sourceLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{dependency.targetLabel}</span>
            <Badge variant="outline">{dependency.type === "BLOQUE" ? "Bloquant" : "Lié à"}</Badge>
          </div>
          {canManage && (
            <Button variant="ghost" size="icon" disabled={isPending} onClick={() => run(dependency.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {dependency.atRisk && dependency.riskMessage && (
          <p className="flex items-start gap-1.5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {dependency.riskMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
