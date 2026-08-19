import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingActionActions } from "@/components/ai-governance/pending-action-actions";
import { resolveDependencyLabels } from "@/lib/dependencies";
import { ShieldCheck } from "lucide-react";

const STATUT_TONE: Record<string, "warning" | "success" | "destructive"> = {
  EN_ATTENTE: "warning",
  APPROUVE: "success",
  REJETE: "destructive",
};

const INSIGHT_STATUT_TONE: Record<string, "info" | "secondary" | "success" | "destructive"> = {
  NOUVEAU: "info",
  VU: "secondary",
  TRAITE: "success",
  IGNORE: "destructive",
};

const AGENT_LABELS: Record<string, string> = {
  PROJECT_MANAGER: "Chef de projet IA",
  CRM_MANAGER: "CRM IA",
  RISK_MANAGER: "Risques IA",
  ANALYST: "Analyste IA",
  ADMINISTRATIVE_ASSISTANT: "Assistant administratif IA",
  STRATEGY_ADVISOR: "Conseiller stratégique IA",
};

/**
 * Gouvernance IA (cahier des charges V2.2 §42-43, étendu V3.0 §47 "AI
 * Governance") — "human in the loop" : actions IA en attente de validation
 * humaine + traçabilité de toutes les décisions (approuvées/rejetées) et
 * des suggestions non exécutées (AutomationExecution, déjà la source de
 * vérité pour toute exécution d'automatisation, réutilisée ici plutôt qu'un
 * nouveau journal). §47 ajoute le registre des agents IA (AiAgentInsight)
 * ci-dessous, jusque-là invisible depuis cette page bien que déjà journalisé
 * par recordInsight() pour chaque agent (§9, §16, prédictions...).
 */
export default async function GouvernanceIaPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.AI_GOVERNANCE_APPROVE)) {
    redirect("/dashboard");
  }

  const [pending, decided, recentExecutions, agentInsights] = await Promise.all([
    prisma.pendingAiAction.findMany({
      where: { statut: "EN_ATTENTE" },
      include: { rule: { select: { nom: true, action: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pendingAiAction.findMany({
      where: { statut: { not: "EN_ATTENTE" } },
      include: { rule: { select: { nom: true } }, decidedBy: { select: { name: true } } },
      orderBy: { decidedAt: "desc" },
      take: 20,
    }),
    prisma.automationExecution.findMany({
      include: { rule: { select: { nom: true, niveauIA: true } } },
      orderBy: { executedAt: "desc" },
      take: 30,
    }),
    prisma.aiAgentInsight.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  // Registre des agents IA (comble V3.0 §47, "AI Governance" — traçabilité
  // agent/donnees-utilisees/recommandation/resultat ; les insights restent
  // purement informationnels, sans exécution automatique, donc pas de champ
  // "validation" applicable ici (voir "En attente de validation" ci-dessus
  // pour le flux qui, lui, exécute réellement une action).
  const entityLabels = await resolveDependencyLabels(
    agentInsights
      .filter((i) => i.entityType && i.entityId)
      .map((i) => ({ type: i.entityType!, id: i.entityId! }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-6" />
        <div>
          <h1 className="text-2xl font-semibold">Gouvernance IA</h1>
          <p className="text-sm text-muted-foreground">
            Trois niveaux — Suggestion, Validation humaine, Automatisation autorisée — et traçabilité complète de
            chaque action IA (cahier des charges §42-43).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">En attente de validation ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Aucune action en attente.</p>}
          {pending.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">
                  Règle « {p.rule.nom} » · {p.rule.action} · {p.createdAt.toLocaleString("fr-FR")}
                </p>
              </div>
              <PendingActionActions id={p.id} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Décisions récentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {decided.length === 0 && <p className="text-sm text-muted-foreground">Aucune décision pour le moment.</p>}
          {decided.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={STATUT_TONE[d.statut]}>{d.statut}</Badge>
              <span>{d.label}</span>
              <span className="text-xs text-muted-foreground">
                par {d.decidedBy?.name ?? "—"} le {d.decidedAt?.toLocaleDateString("fr-FR")}
                {d.motifRejet ? ` — ${d.motifRejet}` : ""}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registre des agents IA ({agentInsights.length})</CardTitle>
          <p className="text-xs text-muted-foreground">
            Agent · donnée utilisée · recommandation · statut — traçabilité des agents IA (§16, §9, prédictions...),
            distincte des actions d&apos;automatisation ci-dessus.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {agentInsights.length === 0 && <p className="text-sm text-muted-foreground">Aucun insight généré.</p>}
          {agentInsights.map((insight) => (
            <div key={insight.id} className="space-y-1 rounded-md border p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{AGENT_LABELS[insight.agent] ?? insight.agent}</Badge>
                <Badge variant={INSIGHT_STATUT_TONE[insight.statut]}>{insight.statut}</Badge>
                <span className="text-xs text-muted-foreground">{insight.type}</span>
              </div>
              <p className="text-sm font-medium">{insight.titre}</p>
              <p className="text-xs text-muted-foreground">{insight.contenu}</p>
              {insight.entityType && insight.entityId && (
                <p className="text-xs text-muted-foreground">
                  Donnée utilisée : {entityLabels.get(`${insight.entityType}:${insight.entityId}`) ?? `${insight.entityType} (${insight.entityId})`}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal d&apos;exécution (traçabilité)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentExecutions.map((e) => (
            <p key={e.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{e.rule.nom}</span> ({e.rule.niveauIA}) —{" "}
              {e.resultat} · {e.executedAt.toLocaleString("fr-FR")}
            </p>
          ))}
          {recentExecutions.length === 0 && <p className="text-sm text-muted-foreground">Aucune exécution.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
