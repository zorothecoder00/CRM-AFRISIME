import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Digital Maturity Assessment (cahier des charges V3.0 §33) — distinct du
// Health Score (§13, health-score.ts) : le Health Score mesure la vitalité
// opérationnelle "en ce moment" (charge, retards, décisions traitées...),
// la maturité mesure le degré de développement des PRATIQUES et OUTILS de
// l'organisation (existe-t-il une gouvernance formalisée ? mesure-t-on la
// performance ? l'IA est-elle adoptée ?...) — deux dimensions parfois
// nommées pareil (gouvernance, processus, performance, risques) mais
// calculées différemment. Pas de modèle de poids configurable (contrairement
// au Health Score) : le cahier ne demande pas de pondération, poids égaux.

export type MaturityDimension =
  | "STRATEGIE"
  | "GOUVERNANCE"
  | "DIGITALISATION"
  | "PROCESSUS"
  | "COLLABORATION"
  | "GESTION_DONNEES"
  | "PERFORMANCE"
  | "INNOVATION"
  | "IA"
  | "GESTION_RISQUES";

export const MATURITY_DIMENSION_LABELS: Record<MaturityDimension, string> = {
  STRATEGIE: "Stratégie",
  GOUVERNANCE: "Gouvernance",
  DIGITALISATION: "Digitalisation",
  PROCESSUS: "Processus",
  COLLABORATION: "Collaboration",
  GESTION_DONNEES: "Gestion des données",
  PERFORMANCE: "Performance",
  INNOVATION: "Innovation",
  IA: "IA",
  GESTION_RISQUES: "Gestion des risques",
};

const RECOMMENDATIONS: Record<MaturityDimension, string> = {
  STRATEGIE: "Formaliser vision/mission/valeurs et rattacher chaque axe stratégique à des objectifs mesurables.",
  GOUVERNANCE: "Mettre en place des instances de gouvernance avec un rythme de réunion régulier et des décisions tracées.",
  DIGITALISATION: "Étendre l'usage des intégrations, automatisations et API existantes plutôt que les processus manuels.",
  PROCESSUS: "Documenter les étapes de chaque processus clé et les faire évoluer au-delà de la version brouillon.",
  COLLABORATION: "Encourager les échanges inter-départements et l'usage des espaces collaboratifs partagés.",
  GESTION_DONNEES: "Définir des politiques de rétention et structurer les données avec des tags et permissions cohérentes.",
  PERFORMANCE: "Rattacher un indicateur mesurable à chaque objectif stratégique et projet actif.",
  INNOVATION: "Capitaliser les expériences (base de connaissances) et engager des transformations structurées.",
  IA: "Passer progressivement des automatisations en suggestion à des niveaux assistés, avec un contrôle humain conservé.",
  GESTION_RISQUES: "Définir un plan de mitigation pour chaque risque organisationnel identifié.",
};

export type MaturityDimensionScore = {
  dimension: MaturityDimension;
  label: string;
  score: number;
  explication: string;
  recommandation: string;
};

export type MaturityAssessment = {
  score: number;
  dimensions: MaturityDimensionScore[];
  forces: MaturityDimensionScore[];
  faiblesses: MaturityDimensionScore[];
};

function clamp0100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? clamp0100((numerator / denominator) * 100) : 0;
}

// Mis en cache 10 min (revalidate) — même logique que health-score.ts
// (computeOrganizationalHealth) : agrégat sur ~20 tables recalculé en
// entier à chaque affichage. Pas de tag par mutation source (trop de
// contributeurs disparates, un oubli figerait le score plutôt que
// simplement le rafraîchir un peu en retard) ; pas d'action de
// configuration dédiée ici (contrairement au Health Score et ses poids)
// donc uniquement du time-based, plus long que le Health Score car la
// maturité évolue par nature plus lentement (pratiques/outils, pas
// activité au jour le jour).
async function computeMaturityAssessmentUncached(): Promise<MaturityAssessment> {
  const [
    profile,
    strategicAxesCount,
    swotItemsCount,
    objectivesTotal,
    objectivesWithAxis,
    governanceInstancesCount,
    governanceMeetingsRecent,
    decisionMatricesCount,
    integrationsActive,
    automationRulesCount,
    apiKeysCount,
    processus,
    conversationsCount,
    whiteboardsCount,
    retentionPoliciesActive,
    tagsCount,
    objectivesWithIndicator,
    knowledgeArticlesPublished,
    transformationsCount,
    aiInsightsCount,
    pendingAiActionsCount,
    automationByNiveau,
    organizationalRisks,
    complianceObligationsTotal,
    complianceObligationsSuivies,
  ] = await Promise.all([
    prisma.organizationProfile.findUnique({ where: { id: "org-profile" } }),
    prisma.strategicAxis.count(),
    prisma.swotItem.count(),
    prisma.objective.count(),
    prisma.objective.count({ where: { axisId: { not: null } } }),
    prisma.governanceInstance.count(),
    prisma.governanceMeeting.count({ where: { dateHeure: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } }),
    prisma.decisionMatrix.count(),
    prisma.integration.count({ where: { statut: "CONNECTE" } }),
    prisma.automationRule.count({ where: { isActive: true } }),
    prisma.apiKey.count(),
    prisma.processus.findMany({ select: { statut: true, version: true, _count: { select: { etapes: true } } } }),
    prisma.conversation.count(),
    prisma.whiteboard.count(),
    prisma.retentionPolicy.count({ where: { isActive: true } }),
    prisma.tag.count(),
    prisma.objective.count({ where: { indicators: { some: {} } } }),
    prisma.knowledgeArticle.count({ where: { statut: "PUBLIE" } }),
    prisma.transformation.count(),
    prisma.aiAgentInsight.count(),
    prisma.pendingAiAction.count(),
    prisma.automationRule.groupBy({ by: ["niveauIA"], _count: true }),
    prisma.organizationalRisk.findMany({ select: { planMitigation: true } }),
    prisma.complianceObligation.count(),
    prisma.complianceObligation.count({ where: { statut: "A_JOUR" } }),
  ]);

  const strategieScore = clamp0100(
    (profile?.vision ? 20 : 0) +
      (profile?.mission ? 20 : 0) +
      (profile?.valeurs ? 10 : 0) +
      (strategicAxesCount > 0 ? 20 : 0) +
      (swotItemsCount > 0 ? 10 : 0) +
      ratio(objectivesWithAxis, objectivesTotal) * 0.2
  );

  const gouvernanceScore = clamp0100(
    (governanceInstancesCount > 0 ? 35 : 0) + (governanceMeetingsRecent > 0 ? 35 : 0) + (decisionMatricesCount > 0 ? 30 : 0)
  );

  const digitalisationScore = clamp0100(
    Math.min(40, integrationsActive * 10) + Math.min(40, automationRulesCount * 4) + (apiKeysCount > 0 ? 20 : 0)
  );

  const processusVersionne = processus.filter((p) => p.version > 1).length;
  const processusDocumente = processus.filter((p) => p._count.etapes > 0).length;
  const processusScore = clamp0100(
    ratio(processus.filter((p) => p.statut === "ACTIF").length, processus.length) * 0.4 +
      ratio(processusVersionne, processus.length) * 0.3 +
      ratio(processusDocumente, processus.length) * 0.3
  );

  const collaborationScore = clamp0100(Math.min(60, conversationsCount * 3) + Math.min(40, whiteboardsCount * 8));

  const gestionDonneesScore = clamp0100(
    (retentionPoliciesActive > 0 ? 40 : 0) + Math.min(40, tagsCount * 4) + (retentionPoliciesActive > 0 && tagsCount > 0 ? 20 : 0)
  );

  const performanceScore = ratio(objectivesWithIndicator, objectivesTotal);

  const innovationScore = clamp0100(Math.min(50, knowledgeArticlesPublished * 5) + Math.min(50, transformationsCount * 15));

  const niveauCounts = new Map(automationByNiveau.map((r) => [r.niveauIA, r._count]));
  const totalAutomationRules = automationByNiveau.reduce((s, r) => s + r._count, 0);
  const assisteOuValidation = (niveauCounts.get("VALIDATION") ?? 0) + (niveauCounts.get("SUGGESTION") ?? 0);
  const iaScore = clamp0100(
    Math.min(40, aiInsightsCount * 2) + Math.min(30, pendingAiActionsCount * 3) + ratio(assisteOuValidation, totalAutomationRules) * 0.3
  );

  const risquesAvecPlan = organizationalRisks.filter((r) => r.planMitigation && r.planMitigation.trim().length > 0).length;
  const gestionRisquesScore = clamp0100(
    ratio(risquesAvecPlan, organizationalRisks.length) * 0.6 + ratio(complianceObligationsSuivies, complianceObligationsTotal) * 0.4
  );

  const raw: { dimension: MaturityDimension; score: number; explication: string }[] = [
    { dimension: "STRATEGIE", score: strategieScore, explication: `${strategicAxesCount} axe(s) stratégique(s), ${objectivesWithAxis}/${objectivesTotal} objectif(s) rattaché(s).` },
    { dimension: "GOUVERNANCE", score: gouvernanceScore, explication: `${governanceInstancesCount} instance(s), ${governanceMeetingsRecent} réunion(s) sur 12 mois, ${decisionMatricesCount} matrice(s) de décision.` },
    { dimension: "DIGITALISATION", score: digitalisationScore, explication: `${integrationsActive} intégration(s) active(s), ${automationRulesCount} automatisation(s), ${apiKeysCount} clé(s) API.` },
    { dimension: "PROCESSUS", score: processusScore, explication: `${processusDocumente}/${processus.length} processus documenté(s), ${processusVersionne} versionné(s).` },
    { dimension: "COLLABORATION", score: collaborationScore, explication: `${conversationsCount} conversation(s), ${whiteboardsCount} tableau(x) blanc.` },
    { dimension: "GESTION_DONNEES", score: gestionDonneesScore, explication: `${retentionPoliciesActive} politique(s) de rétention active(s), ${tagsCount} tag(s) définis.` },
    { dimension: "PERFORMANCE", score: performanceScore, explication: `${objectivesWithIndicator}/${objectivesTotal} objectif(s) avec indicateur mesurable.` },
    { dimension: "INNOVATION", score: innovationScore, explication: `${knowledgeArticlesPublished} article(s) publié(s), ${transformationsCount} transformation(s) engagée(s).` },
    { dimension: "IA", score: iaScore, explication: `${aiInsightsCount} insight(s) IA généré(s), ${pendingAiActionsCount} action(s) IA soumise(s) à validation.` },
    { dimension: "GESTION_RISQUES", score: gestionRisquesScore, explication: `${risquesAvecPlan}/${organizationalRisks.length} risque(s) avec plan de mitigation.` },
  ];

  const dimensions: MaturityDimensionScore[] = raw.map((r) => ({
    ...r,
    label: MATURITY_DIMENSION_LABELS[r.dimension],
    recommandation: RECOMMENDATIONS[r.dimension],
  }));

  const score = clamp0100(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);

  return {
    score,
    dimensions,
    forces: sorted.slice(0, 3),
    faiblesses: sorted.slice(-3).reverse(),
  };
}

export const computeMaturityAssessment = unstable_cache(computeMaturityAssessmentUncached, ["maturity-assessment"], {
  revalidate: 600,
});
