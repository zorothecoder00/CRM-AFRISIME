import { prisma } from "@/lib/prisma";
import { computeCriticite } from "@/lib/risk-matrix";
import { computeWorkload } from "@/lib/workload";
import { recordInsight } from "@/lib/ai-agents";

export type OrchestratorStep = { agent: string; label: string; resume: string; details: string[] };
export type OrchestratorResult = { steps: OrchestratorStep[]; recommandationConsolidee: string };

// AI Agent Orchestrator (cahier des charges V3.0 §16) — "au lieu d'avoir
// uniquement plusieurs agents IA indépendants, la V3 introduit un
// orchestrateur d'agents" : AI Strategy Advisor demande séquentiellement à
// AI Project Manager, AI Risk Manager, AI Resource Manager, puis consolide.
// Distinct du Conseiller stratégique (§9, 5 questions fixes indépendantes) :
// ici c'est un pipeline nommé étape par étape aboutissant à UNE
// recommandation consolidée. Toujours sans clé LLM : chaque "agent" est une
// requête déterministe sur les données existantes, pas un raisonnement
// en langage naturel.

async function askProjectManager(): Promise<OrchestratorStep> {
  const projects = await prisma.project.findMany({
    where: { statut: "EN_COURS", deletedAt: null },
    select: { id: true, nom: true, dateFin: true, budget: true, coutReel: true },
  });
  const now = Date.now();
  const enRetard = projects.filter((p) => p.dateFin && p.dateFin.getTime() < now);
  const depasses = projects.filter((p) => p.budget !== null && p.coutReel !== null && Number(p.coutReel) > Number(p.budget));

  return {
    agent: "AI Project Manager",
    label: "Analyse des projets",
    resume: `${projects.length} projet(s) actif(s) — ${enRetard.length} en retard, ${depasses.length} en dépassement budgétaire.`,
    details: [...enRetard.map((p) => `Retard : ${p.nom}`), ...depasses.map((p) => `Dépassement budgétaire : ${p.nom}`)],
  };
}

async function askRiskManager(): Promise<OrchestratorStep> {
  const [orgRisks, projectRisks] = await Promise.all([
    prisma.organizationalRisk.findMany({
      where: { statut: { not: "CLOS" }, criticite: { in: ["ELEVE", "CRITIQUE"] } },
      select: { titre: true },
    }),
    prisma.projectRisk.findMany({
      where: { statut: { not: "CLOS" } },
      select: { titre: true, probabilite: true, impact: true, project: { select: { nom: true } } },
    }),
  ]);
  const criticalProjectRisks = projectRisks.filter((r) => {
    const c = computeCriticite(r.probabilite, r.impact);
    return c === "ELEVE" || c === "CRITIQUE";
  });
  const total = orgRisks.length + criticalProjectRisks.length;

  return {
    agent: "AI Risk Manager",
    label: "Analyse des risques",
    resume: `${total} risque(s) élevé(s)/critique(s) ouvert(s) sur le périmètre organisationnel et projets.`,
    details: [
      ...orgRisks.map((r) => `Risque organisationnel : ${r.titre}`),
      ...criticalProjectRisks.map((r) => `Risque projet (${r.project.nom}) : ${r.titre}`),
    ],
  };
}

async function askResourceManager(): Promise<OrchestratorStep> {
  const [users, tasks, leaves] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capaciteHebdomadaireHeures: true, role: { select: { label: true } }, department: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: {
        statut: true,
        tempsEstimeHeures: true,
        tempsReelHeures: true,
        responsablePrincipalId: true,
        assignees: { select: { userId: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" }, select: { userId: true, dateDebut: true, dateFin: true, statut: true } }),
  ]);

  const workload = computeWorkload(
    users.map((u) => ({ id: u.id, name: u.name, roleLabel: u.role.label, capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures) })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves
  );
  const enSurcharge = workload.filter((w) => w.enSurcharge);
  const surchargePct = users.length > 0 ? Math.round((enSurcharge.length / users.length) * 100) : 0;

  const byDepartment = new Map<string, number>();
  users.forEach((u, i) => {
    if (!workload[i]?.enSurcharge) return;
    const dept = u.department?.name ?? "Sans département";
    byDepartment.set(dept, (byDepartment.get(dept) ?? 0) + 1);
  });

  return {
    agent: "AI Resource Manager",
    label: "Analyse de la capacité",
    resume: `${surchargePct}% des collaborateurs actifs en surcharge (${enSurcharge.length}/${users.length}).`,
    details: Array.from(byDepartment.entries()).map(([dept, count]) => `${dept} : ${count} collaborateur(s) en surcharge`),
  };
}

function consolidate(steps: OrchestratorStep[]): string {
  const [projectStep, riskStep, resourceStep] = steps;
  const points: string[] = [];
  if (projectStep.details.length > 0) points.push(`traiter en priorité les ${projectStep.details.length} projet(s) signalé(s) par l'AI Project Manager`);
  if (riskStep.details.length > 0) points.push(`traiter les ${riskStep.details.length} risque(s) élevé(s)/critique(s) identifié(s) par l'AI Risk Manager`);
  if (resourceStep.details.length > 0) points.push(`rééquilibrer la charge dans les équipes signalées par l'AI Resource Manager`);

  if (points.length === 0) {
    return "Aucun signal préoccupant combiné détecté sur les projets, risques ou capacité — situation stable sur ce périmètre.";
  }
  return `Recommandation stratégique consolidée : ${points.join(" ; ")}.`;
}

export async function runAgentOrchestration(): Promise<OrchestratorResult> {
  const steps = await Promise.all([askProjectManager(), askRiskManager(), askResourceManager()]);
  return { steps, recommandationConsolidee: consolidate(steps) };
}

/** Journalise la recommandation consolidée (agent STRATEGY_ADVISOR, qui pilote l'orchestration) — même trace que les autres agents IA. */
export async function recordOrchestrationRecommendation() {
  const result = await runAgentOrchestration();
  await recordInsight({
    agent: "STRATEGY_ADVISOR",
    type: "RECOMMANDATION",
    titre: "Recommandation stratégique consolidée (orchestrateur d'agents)",
    contenu: result.recommandationConsolidee,
    entityType: "Organization",
    entityId: "agent-orchestrator",
  });
  return result;
}
