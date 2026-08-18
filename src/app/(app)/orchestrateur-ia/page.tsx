import { runAgentOrchestration } from "@/lib/agent-orchestrator";
import { OrchestratorPanel } from "@/components/agents/orchestrator-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// AI Agent Orchestrator (cahier des charges V3.0 §16) — pipeline
// séquentiel : AI Strategy Advisor interroge AI Project Manager, puis AI
// Risk Manager, puis AI Resource Manager, et consolide leurs résultats en
// une recommandation unique. Distinct des agents indépendants (/agents-ia)
// et du Conseiller stratégique (/conseiller-strategique, §9).
export default async function AgentOrchestratorPage() {
  const result = await runAgentOrchestration();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orchestrateur d&apos;agents IA</h1>
        <p className="text-sm text-muted-foreground">
          AI Strategy Advisor coordonne AI Project Manager, AI Risk Manager et AI Resource Manager, puis rassemble
          leurs résultats en une recommandation stratégique consolidée.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <OrchestratorPanel initialResult={result} />
        </CardContent>
      </Card>
    </div>
  );
}
