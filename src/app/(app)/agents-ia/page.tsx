import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { InsightList, type InsightData } from "@/components/ai-agents/insight-list";

const AGENT_FILTERS = [
  { value: "PROJECT_MANAGER", label: "AI Project Manager" },
  { value: "CRM_MANAGER", label: "AI CRM Manager" },
  { value: "RISK_MANAGER", label: "AI Risk Manager" },
  { value: "ANALYST", label: "AI Analyst" },
  { value: "ADMINISTRATIVE_ASSISTANT", label: "AI Administrative Assistant" },
  { value: "STRATEGY_ADVISOR", label: "AI Strategy Advisor" },
];

/**
 * V2.2 §6 — agents IA spécialisés. Chaque agent (src/lib/ai-agents.ts) écrit
 * des AiAgentInsight une fois par jour (cron) à partir de règles
 * déterministes ; pas de génération LLM tant qu'aucune clé API n'est
 * configurée — le champ `contenu` est templaté, mais le schéma/la page
 * n'auront pas à changer le jour où un vrai modèle rédige ce texte.
 */
export default async function AgentsIaPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const { agent } = await searchParams;

  const insights = await prisma.aiAgentInsight.findMany({
    where: agent ? { agent: agent as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const insightData: InsightData[] = insights.map((i) => ({
    id: i.id,
    agent: i.agent,
    type: i.type,
    titre: i.titre,
    contenu: i.contenu,
    statut: i.statut,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agents IA</h1>
        <p className="text-sm text-muted-foreground">
          Analyses quotidiennes déterministes par agent spécialisé — retards, opportunités, risques, KPI,
          validations bloquées, écarts d&apos;objectifs.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/agents-ia"
          className={`rounded-full border px-3 py-1 ${!agent ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          Tous
        </Link>
        {AGENT_FILTERS.map((a) => (
          <Link
            key={a.value}
            href={`/agents-ia?agent=${a.value}`}
            className={`rounded-full border px-3 py-1 ${agent === a.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <InsightList insights={insightData} />
    </div>
  );
}
