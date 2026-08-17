import { prisma } from "@/lib/prisma";
import { computeScopePilotage, getDepartmentScope } from "@/lib/pilotage-levels";
import { computeTeamPrediction } from "@/lib/predictive-scoring";
import { classifyWorkload } from "@/lib/workload";
import type { Scenario } from "@/generated/prisma/client";

const RESSOURCES_SEUIL_FRAGILE = 2;

function estimatePlanningRetard(tauxOccupationMoyen: number | null): number {
  if (tauxOccupationMoyen === null || tauxOccupationMoyen <= 100) return 0;
  return Math.round(((tauxOccupationMoyen - 100) / 100) * 30);
}

export type ScenarioImpact = {
  headcount: number;
  projectsTotal: number;
  projectsActifs: number;
  tauxOccupationMoyen: number | null;
  chargeRepartition: { sousCharge: number; chargeNormale: number; surcharge: number };
  risquesCritiques: number;
  besoinsCompetences: { competenceId: string; competenceNom: string; demande: number; disponible: number }[];
  projetsSousDotes: string[];
  // Comble V2.2 §14 "planning", absent du calcul jusqu'ici. Estimation
  // grossière : jours de glissement moyen au-delà de 100% d'occupation
  // (chaque tranche de 100 points d'occupation en trop ~ 30 jours de
  // glissement), 0 si la charge reste soutenable.
  planningRetardEstimeJours: number;
};

/**
 * Situation actuelle d'un périmètre (V2.2 §14-§15) — réutilise
 * computeScopePilotage (module 10, déjà en place) plutôt que de recalculer
 * charge/projets/risques différemment. `departmentId` omis = organisation
 * entière (même convention que /pilotage racine).
 */
export async function computeBaseline(departmentId?: string | null): Promise<ScenarioImpact> {
  let userIds: string[];
  let projectIds: string[];

  if (departmentId) {
    const allDepartments = await prisma.department.findMany({ select: { id: true, name: true, parentId: true } });
    const scope = await getDepartmentScope(departmentId, allDepartments);
    userIds = scope.userIds;
    projectIds = scope.projectIds;
  } else {
    const [users, projects] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, select: { id: true } }),
      prisma.project.findMany({ select: { id: true } }),
    ]);
    userIds = users.map((u) => u.id);
    projectIds = projects.map((p) => p.id);
  }

  const [pilotage, teamPrediction] = await Promise.all([
    computeScopePilotage({ userIds, projectIds }),
    computeTeamPrediction(userIds),
  ]);

  return {
    headcount: pilotage.headcount,
    projectsTotal: pilotage.projectsTotal,
    projectsActifs: pilotage.projectsActifs,
    tauxOccupationMoyen: pilotage.tauxOccupationMoyen,
    chargeRepartition: pilotage.chargeRepartition,
    risquesCritiques: pilotage.risquesCritiques,
    besoinsCompetences: teamPrediction.besoinsCompetences,
    projetsSousDotes: [],
    planningRetardEstimeJours: estimatePlanningRetard(pilotage.tauxOccupationMoyen),
  };
}

/**
 * Projette l'impact d'un scénario par règle de proportionnalité simple —
 * estimation d'ordre de grandeur, pas une simulation détaillée (présenté
 * comme tel côté UI). chargeRepartition n'est PAS recalculée finement (pas
 * de détail par utilisateur à ce niveau d'agrégation) : seule sa forme
 * globale est réévaluée à partir du nouveau taux d'occupation moyen.
 */
export async function computeScenarioImpact(
  scenario: Pick<
    Scenario,
    "type" | "deltaEffectifPercent" | "deltaRessourcesPercent" | "deltaProjetsPercent" | "nouvelleFilialeEffectif" | "nouvelleFilialeProjets" | "departmentId"
  >,
  baseline: ScenarioImpact
): Promise<ScenarioImpact> {
  const effectifFactor = scenario.deltaEffectifPercent ? 1 + Number(scenario.deltaEffectifPercent) / 100 : 1;
  const projetsFactor = scenario.deltaProjetsPercent ? 1 + Number(scenario.deltaProjetsPercent) / 100 : 1;
  const ressourcesFactor = scenario.deltaRessourcesPercent ? 1 + Number(scenario.deltaRessourcesPercent) / 100 : 1;

  let headcount = baseline.headcount;
  let projectsTotal = baseline.projectsTotal;
  let projectsActifs = baseline.projectsActifs;

  if (scenario.type === "NOUVELLE_FILIALE") {
    headcount = baseline.headcount + (scenario.nouvelleFilialeEffectif ?? 0);
    projectsTotal = baseline.projectsTotal + (scenario.nouvelleFilialeProjets ?? 0);
    projectsActifs = baseline.projectsActifs + (scenario.nouvelleFilialeProjets ?? 0);
  } else {
    headcount = Math.round(baseline.headcount * effectifFactor);
    projectsTotal = Math.round(baseline.projectsTotal * projetsFactor);
    projectsActifs = Math.round(baseline.projectsActifs * projetsFactor);
  }

  // Charge ~ proportionnelle au nombre de projets ; capacité effective ~
  // proportionnelle aux effectifs, dégradée si les ressources baissent.
  const chargeFactor = baseline.projectsTotal > 0 ? projectsTotal / baseline.projectsTotal : projetsFactor;
  const capaciteFactor = (baseline.headcount > 0 ? headcount / baseline.headcount : effectifFactor) * ressourcesFactor;
  const tauxOccupationMoyen =
    baseline.tauxOccupationMoyen !== null && capaciteFactor > 0
      ? Math.round(baseline.tauxOccupationMoyen * (chargeFactor / capaciteFactor))
      : baseline.tauxOccupationMoyen;

  const risqueFactor =
    baseline.tauxOccupationMoyen && baseline.tauxOccupationMoyen > 0 && tauxOccupationMoyen !== null
      ? Math.max(1, tauxOccupationMoyen / baseline.tauxOccupationMoyen)
      : 1;
  const risquesCritiques = Math.round(baseline.risquesCritiques * risqueFactor);

  // Répartition à 4 niveaux : reclasse le même effectif total autour du
  // nouveau taux moyen (approximation — pas de détail par personne à ce
  // niveau d'agrégation).
  const totalWorkload =
    baseline.chargeRepartition.sousCharge + baseline.chargeRepartition.chargeNormale + baseline.chargeRepartition.surcharge;
  const chargeRepartition =
    totalWorkload > 0 && tauxOccupationMoyen !== null
      ? (() => {
          const statut = classifyWorkload(tauxOccupationMoyen);
          const base = { sousCharge: 0, chargeNormale: 0, surcharge: 0 };
          if (statut === "SOUS_CHARGE") base.sousCharge = totalWorkload;
          else if (statut === "SURCHARGE") base.surcharge = totalWorkload;
          else base.chargeNormale = totalWorkload;
          return base;
        })()
      : baseline.chargeRepartition;

  let projetsSousDotes: string[] = [];
  if (scenario.type === "RESSOURCES" && ressourcesFactor < 1) {
    const projects = await prisma.project.findMany({
      where: scenario.departmentId ? { departmentId: scenario.departmentId, statut: "EN_COURS" } : { statut: "EN_COURS" },
      select: { id: true, nom: true, _count: { select: { resources: true } } },
    });
    projetsSousDotes = projects.filter((p) => p._count.resources <= RESSOURCES_SEUIL_FRAGILE).map((p) => p.nom);
  }

  // Comble V2.2 §14-15 : jusqu'ici besoinsCompetences était recopié tel quel
  // depuis la baseline, sans tenir compte du scénario. Demande mise à
  // l'échelle du nombre de projets, disponibilité à l'échelle des effectifs
  // — reste une approximation (pas de vraie répartition par compétence),
  // mais réagit désormais réellement aux paramètres du scénario.
  const besoinsCompetences = baseline.besoinsCompetences.map((b) => ({
    ...b,
    demande: Math.round(b.demande * projetsFactor),
    disponible: Math.round(b.disponible * effectifFactor),
  }));

  return {
    headcount,
    projectsTotal,
    projectsActifs,
    tauxOccupationMoyen,
    chargeRepartition,
    risquesCritiques,
    besoinsCompetences,
    projetsSousDotes,
    planningRetardEstimeJours: estimatePlanningRetard(tauxOccupationMoyen),
  };
}
