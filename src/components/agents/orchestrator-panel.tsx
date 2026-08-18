"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { triggerAgentOrchestration } from "@/actions/agent-orchestrator.actions";
import type { OrchestratorResult } from "@/lib/agent-orchestrator";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// V3.0 §16 — bouton pour rejouer le pipeline et journaliser la
// recommandation consolidée (visible ensuite sur /agents-ia, comme les
// autres insights IA) ; le rendu initial (page serveur) reste toujours à
// jour sans ce bouton, qui sert uniquement à tracer/notifier.
export function OrchestratorPanel({ initialResult }: { initialResult: OrchestratorResult }) {
  const [result, setResult] = useState(initialResult);
  const { run, isPending } = useAction(triggerAgentOrchestration, { successMessage: "Recommandation journalisée." });

  async function handleRun() {
    const res = await run();
    if (res.ok) setResult(res.data);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {result.steps.map((step, i) => (
          <div key={step.agent} className="flex gap-3 rounded-md border p-3">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{i + 1}</div>
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {step.agent} <span className="font-normal text-muted-foreground">— {step.label}</span>
              </div>
              <p className="text-sm">{step.resume}</p>
              {step.details.length > 0 && (
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {step.details.map((d, j) => (
                    <li key={j}>• {d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <p className="text-xs font-medium text-muted-foreground">Recommandation stratégique consolidée</p>
        <p className="mt-1 text-sm">{result.recommandationConsolidee}</p>
      </div>

      <Button size="sm" variant="outline" onClick={handleRun} disabled={isPending}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        {isPending ? "Exécution..." : "Rejouer et journaliser"}
      </Button>
    </div>
  );
}
