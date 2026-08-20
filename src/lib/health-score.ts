import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import type { HealthScoreDimension } from "@/generated/prisma/enums";

export const HEALTH_SCORE_CACHE_TAG = "health-score";

export type HealthDimensionScore = {
  dimension: HealthScoreDimension;
  label: string;
  score: number | null;
  poids: number;
  isActive: boolean;
  explication: string;
};

export type OrganizationalHealth = {
  score: number;
  dimensions: HealthDimensionScore[];
};

const DIMENSION_LABELS: Record<HealthScoreDimension, string> = {
  PERFORMANCE: "Performance",
  CHARGE: "Charge",
  RISQUES: "Risques",
  PROJETS: "Projets",
  PROCESSUS: "Processus",
  QUALITE: "Qualité",
  GOUVERNANCE: "Gouvernance",
  TURNOVER: "Turnover",
  SATISFACTION: "Satisfaction",
  ECHEANCES: "Respect des échéances",
};

function clamp0100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Organizational Health Score (cahier des charges V3.0 §13) — score
// synthétique 0-100, moyenne pondérée de 9 dimensions calculées à partir
// des données existantes (aucune donnée stockée, aucune duplication) +
// TURNOVER, exclu du calcul par défaut (pas de modèle de départ/turnover
// dans ce MVP) — "configurable" via HealthScoreWeight, "explicable" via
// `explication` sur chaque dimension.
//
// Mis en cache 5 min (revalidate) : ce calcul agrège des dizaines de
// requêtes sur ~10 tables à chaque affichage de page — coûteux à recalculer
// à chaque visite alors qu'un score organisationnel n'a pas besoin d'être
// seconde-près. Pas de tag par mutation source (tâches, projets, risques...
// des dizaines d'actions y contribuent, un oubli rendrait le score figé
// silencieusement) : uniquement un updateTag ciblé quand les poids
// eux-mêmes changent (src/actions/health-score.actions.ts), là où la
// fraîcheur immédiate compte vraiment pour l'utilisateur qui vient de
// modifier la configuration.
async function computeOrganizationalHealthUncached(): Promise<OrganizationalHealth> {
  const weights = await prisma.healthScoreWeight.findMany();
  const weightByDimension = new Map(weights.map((w) => [w.dimension, w]));
  const weightFor = (dim: HealthScoreDimension) => weightByDimension.get(dim) ?? { poids: 10, isActive: true };

  const now = new Date();

  const [
    activeProjects,
    users,
    tasks,
    leaves,
    orgRisks,
    processus,
    evaluations,
    decisions,
    tachesTermineesAvecEcheance,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { statut: "EN_COURS", deletedAt: null },
      select: { id: true, avancement: true, dateFin: true },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capaciteHebdomadaireHeures: true, role: { select: { label: true } } },
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
    prisma.organizationalRisk.count({ where: { statut: { not: "CLOS" }, criticite: { in: ["ELEVE", "CRITIQUE"] } } }),
    prisma.processus.findMany({ select: { statut: true } }),
    prisma.evaluation.findMany({ where: { scoreGlobal: { not: null }, statut: { not: "BROUILLON" } }, select: { scoreGlobal: true } }),
    Promise.all([
      prisma.meetingDecision.groupBy({ by: ["statut"], _count: true }),
      prisma.governanceDecision.groupBy({ by: ["statut"], _count: true }),
    ]),
    prisma.task.findMany({
      where: { deletedAt: null, statut: "TERMINEE", completedAt: { not: null }, echeance: { not: null } },
      select: { completedAt: true, echeance: true },
    }),
  ]);

  // ── Performance : avancement moyen des projets actifs ──────────────────
  const performanceScore =
    activeProjects.length > 0 ? clamp0100(activeProjects.reduce((s, p) => s + p.avancement, 0) / activeProjects.length) : null;

  // ── Charge : inverse du taux de surcharge ───────────────────────────────
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
  const surchargePct = users.length > 0 ? (workload.filter((w) => w.enSurcharge).length / users.length) * 100 : 0;
  const chargeScore = users.length > 0 ? clamp0100(100 - surchargePct) : null;

  // ── Risques : penalite par risque organisationnel eleve/critique ouvert ─
  const risquesScore = clamp0100(100 - orgRisks * 10);

  // ── Projets : part des projets actifs non en retard ─────────────────────
  const projetsEnRetard = activeProjects.filter((p) => p.dateFin && p.dateFin < now).length;
  const projetsScore = activeProjects.length > 0 ? clamp0100(100 - (projetsEnRetard / activeProjects.length) * 100) : null;

  // ── Processus : part des processus actifs (ni brouillon ni archive) ─────
  const processusScore = processus.length > 0 ? clamp0100((processus.filter((p) => p.statut === "ACTIF").length / processus.length) * 100) : null;

  // ── Qualite : score d'evaluation moyen (echelle 0-5) ─────────────────────
  const qualiteScore =
    evaluations.length > 0
      ? clamp0100((evaluations.reduce((s, e) => s + Number(e.scoreGlobal), 0) / evaluations.length / 5) * 100)
      : null;

  // ── Gouvernance : taux de resolution des decisions (traitees / non annulees) ─
  const [meetingDecisionGroups, governanceDecisionGroups] = decisions;
  const decisionCounts = { EN_COURS: 0, TRAITEE: 0, ANNULEE: 0 };
  for (const g of [...meetingDecisionGroups, ...governanceDecisionGroups]) {
    decisionCounts[g.statut as keyof typeof decisionCounts] += g._count;
  }
  const decisionsTotal = decisionCounts.EN_COURS + decisionCounts.TRAITEE;
  const gouvernanceScore = decisionsTotal > 0 ? clamp0100((decisionCounts.TRAITEE / decisionsTotal) * 100) : null;

  // ── Turnover : aucune donnee pertinente dans ce MVP ──────────────────────
  const turnoverScore = null;

  // ── Satisfaction : position des parties prenantes (FAVORABLE/NEUTRE/OPPOSANT) ─
  const stakeholders = await prisma.stakeholder.findMany({ select: { position: true } });
  const positioned = stakeholders.filter((s) => s.position !== null);
  const satisfactionScore =
    positioned.length > 0
      ? clamp0100(
          positioned.reduce((s, st) => s + (st.position === "FAVORABLE" ? 100 : st.position === "NEUTRE" ? 50 : 0), 0) /
            positioned.length
        )
      : null;

  // ── Respect des echeances : taches terminees a temps ─────────────────────
  const aTemps = tachesTermineesAvecEcheance.filter((t) => t.completedAt!.getTime() <= t.echeance!.getTime()).length;
  const echeancesScore =
    tachesTermineesAvecEcheance.length > 0 ? clamp0100((aTemps / tachesTermineesAvecEcheance.length) * 100) : null;

  const raw: { dimension: HealthScoreDimension; score: number | null; explication: string }[] = [
    { dimension: "PERFORMANCE", score: performanceScore, explication: `Avancement moyen des ${activeProjects.length} projet(s) actif(s).` },
    { dimension: "CHARGE", score: chargeScore, explication: `${Math.round(surchargePct)}% des collaborateurs actifs en surcharge.` },
    { dimension: "RISQUES", score: risquesScore, explication: `${orgRisks} risque(s) organisationnel(s) élevé(s)/critique(s) ouvert(s).` },
    { dimension: "PROJETS", score: projetsScore, explication: `${projetsEnRetard}/${activeProjects.length} projet(s) actif(s) en retard.` },
    { dimension: "PROCESSUS", score: processusScore, explication: `${processus.filter((p) => p.statut === "ACTIF").length}/${processus.length} processus actif(s).` },
    { dimension: "QUALITE", score: qualiteScore, explication: `Score d'évaluation moyen sur ${evaluations.length} évaluation(s) soumise(s).` },
    { dimension: "GOUVERNANCE", score: gouvernanceScore, explication: `${decisionCounts.TRAITEE}/${decisionsTotal} décision(s) traitée(s) (hors annulées).` },
    { dimension: "TURNOVER", score: turnoverScore, explication: "Aucune donnée de départ/turnover disponible dans ce système." },
    { dimension: "SATISFACTION", score: satisfactionScore, explication: `Position moyenne de ${positioned.length} partie(s) prenante(s) renseignée(s).` },
    { dimension: "ECHEANCES", score: echeancesScore, explication: `${aTemps}/${tachesTermineesAvecEcheance.length} tâche(s) terminée(s) dans les délais.` },
  ];

  const dimensions: HealthDimensionScore[] = raw.map((r) => {
    const w = weightFor(r.dimension);
    return { dimension: r.dimension, label: DIMENSION_LABELS[r.dimension], score: r.score, poids: w.poids, isActive: w.isActive, explication: r.explication };
  });

  const included = dimensions.filter((d) => d.isActive && d.score !== null);
  const totalWeight = included.reduce((s, d) => s + d.poids, 0);
  const score = totalWeight > 0 ? clamp0100(included.reduce((s, d) => s + d.score! * d.poids, 0) / totalWeight) : 0;

  return { score, dimensions };
}

export const computeOrganizationalHealth = unstable_cache(computeOrganizationalHealthUncached, ["organizational-health"], {
  tags: [HEALTH_SCORE_CACHE_TAG],
  revalidate: 300,
});
