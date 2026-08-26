import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { ArrowDown } from "lucide-react";
import type { ResultFrameworkTier } from "@/lib/result-framework";

/** Result Framework (cahier des charges Project Studio §50) — pyramide Impact → Outcomes → Outputs → Activités → Tâches. */
export function ResultFrameworkView({ tiers }: { tiers: ResultFrameworkTier[] }) {
  const hasAnyToC = tiers.some((t) => t.key !== "TACHES" && t.nodeCount > 0);

  return (
    <div className="space-y-3">
      {!hasAnyToC && (
        <p className="text-sm text-muted-foreground">
          Aucune Théorie du changement définie (onglet Théorie du changement) — seul le niveau Tâches est
          calculable pour l&apos;instant.
        </p>
      )}
      <div className="mx-auto max-w-xl space-y-1">
        {tiers.map((tier, i) => (
          <div key={tier.key}>
            <Card size="sm">
              <CardContent className="space-y-1.5 px-(--card-spacing)">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{tier.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{tier.nodeCount}</Badge>
                    <span className="text-sm font-semibold">
                      {tier.progression !== null ? `${tier.progression}%` : "—"}
                    </span>
                  </div>
                </div>
                <ProgressBar value={tier.progression ?? 0} />
              </CardContent>
            </Card>
            {i < tiers.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
