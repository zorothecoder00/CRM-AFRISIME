"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateInsightStatus } from "@/actions/ai-agents.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, EyeOff } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  PROJECT_MANAGER: "AI Project Manager",
  CRM_MANAGER: "AI CRM Manager",
  RISK_MANAGER: "AI Risk Manager",
  ANALYST: "AI Analyst",
  ADMINISTRATIVE_ASSISTANT: "AI Administrative Assistant",
  STRATEGY_ADVISOR: "AI Strategy Advisor",
};

const TYPE_TONE: Record<string, "destructive" | "warning" | "info"> = {
  ALERTE: "destructive",
  ANOMALIE: "warning",
  RECOMMANDATION: "info",
  RAPPORT: "info",
};

export type InsightData = {
  id: string;
  agent: string;
  type: string;
  titre: string;
  contenu: string;
  statut: string;
  createdAt: string;
};

export function InsightList({ insights }: { insights: InsightData[] }) {
  if (insights.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun insight pour ce filtre.</p>;
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}

function InsightCard({ insight }: { insight: InsightData }) {
  const [statut, setStatut] = useState(insight.statut);
  const { run, isPending } = useAction(updateInsightStatus);

  async function updateStatus(next: "VU" | "TRAITE" | "IGNORE") {
    const result = await run(insight.id, next);
    if (result.ok) setStatut(next);
  }

  const tone = TYPE_TONE[insight.type] ?? "info";

  return (
    <Card accent={statut === "NOUVEAU" ? tone : "none"}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{AGENT_LABELS[insight.agent] ?? insight.agent}</Badge>
            <Badge variant={tone === "destructive" ? "destructive" : "secondary"}>{insight.type}</Badge>
            {statut !== "NOUVEAU" && <Badge variant="outline">{statut}</Badge>}
          </div>
          <CardTitle className="mt-1 text-base">{insight.titre}</CardTitle>
        </div>
        {statut === "NOUVEAU" && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" disabled={isPending} onClick={() => updateStatus("TRAITE")} title="Marquer comme traité">
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled={isPending} onClick={() => updateStatus("IGNORE")} title="Ignorer">
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{insight.contenu}</p>
        <p className="mt-2 text-xs text-muted-foreground">{new Date(insight.createdAt).toLocaleString("fr-FR")}</p>
      </CardContent>
    </Card>
  );
}
