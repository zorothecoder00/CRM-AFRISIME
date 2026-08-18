import { prisma } from "@/lib/prisma";
import { computeScopePilotage, getDepartmentScope } from "@/lib/pilotage-levels";
import { computeTeamPrediction } from "@/lib/predictive-scoring";
import { classifyWorkload, computeWorkload } from "@/lib/workload";
import type { Scenario } from "@/generated/prisma/client";

const RESSOURCES_SEUIL_FRAGILE = 2;

export type OrganizationalImpactLevel = "FAIBLE" | "MOYEN" | "ELEVE";

/**
 * Niveau d'impact organisationnel (cahier des charges V3.0 §7 — "impact
 * organisationnel" parmi les sorties du Scenario Simulator 3.0). Meme
 * echelle a 3 crans que l'analyse d'impact §6 (src/lib/impact-analysis.ts),
 * mais un heuristique distinct : ici on mesure l'ecart entre la situation
 * projetee et la situation actuelle, pas un score absolu.
 */
function classifyOrganizationalImpact(baseline: ScenarioImpact, projected: ScenarioImpact): OrganizationalImpactLevel {
  const occupationDelta =
    baseline.tauxOccupationMoyen !== null && projected.tauxOccupationMoyen !== null
      ? projected.tauxOccupationMoyen - baseline.tauxOccupationMoyen
      : 0;
  const score =
    Math.max(0, occupationDelta) / 10 +
    Math.max(0, projected.risquesCritiques - baseline.risquesCritiques) * 2 +
    projected.projetsSousDotes.length * 1.5 +
    Math.max(0, (projected.chargeManagersMoyen ?? 0) - (baseline.chargeManagersMoyen ?? 0)) / 10;
  if (score >= 8) return "ELEVE";
  if (score >= 3) return "MOYEN";
  return "FAIBLE";
}

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
  // ── V3.0 §7 "Scenario Simulator 3.0" — dimensions supplementaires ──────
  chargeManagersMoyen: number | null;
  partenairesImpactes: number;
  processusImpactes: number;
  impactOrganisationnel: OrganizationalImpactLevel;
  indicateursPrevisionnels: { nom: string; valeurCible: number; valeurActuelle: number; valeurPrevue: number }[];
  // ── V3.0 §8 "What-If Engine" — variables budget/objectifs, sans effet
  // calcule sur le reste du modele (pas de lien budget/objectifs -> charge
  // dans les donnees existantes) : affichees telles quelles, projetees
  // lineairement a partir de leur propre delta.
  budgetTotal: number;
  objectifsTotal: number;
};

/**
 * Dimensions ajoutées par le Scenario Simulator 3.0 (V3.0 §7) : charge des
 * managers, partenaires/processus impactés (via le modèle générique
 * Dependency, même principe que l'analyse d'impact §6), indicateurs
 * prévisionnels (Indicator déjà rattachés aux objectifs/projets du
 * périmètre).
 */
async function computeAdvancedDimensions(userIds: string[], projectIds: string[], departmentId?: string | null) {
  const [managers, indicators, objectifsTotal] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds }, directReports: { some: {} } },
      select: { id: true, name: true, capaciteHebdomadaireHeures: true, role: { select: { label: true } } },
    }),
    prisma.indicator.findMany({
      where: { OR: [{ projectId: { in: projectIds } }, { objective: { projectId: { in: projectIds } } }] },
      select: { nom: true, valeurCible: true, valeurActuelle: true },
      take: 8,
    }),
    departmentId
      ? prisma.objective.count({ where: { OR: [{ projectId: { in: projectIds } }, { departmentId }] } })
      : prisma.objective.count(),
  ]);

  let chargeManagersMoyen: number | null = null;
  if (managers.length > 0) {
    const managerIds = managers.map((m) => m.id);
    const [managerTasks, managerLeaves] = await Promise.all([
      prisma.task.findMany({
        where: {
          deletedAt: null,
          OR: [{ responsablePrincipalId: { in: managerIds } }, { assignees: { some: { userId: { in: managerIds } } } }],
        },
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
      prisma.leave.findMany({ where: { statut: "APPROUVE", userId: { in: managerIds } } }),
    ]);
    const workload = computeWorkload(
      managers.map((m) => ({
        id: m.id,
        name: m.name,
        roleLabel: m.role.label,
        capaciteHebdomadaireHeures: Number(m.capaciteHebdomadaireHeures),
      })),
      managerTasks.map((t) => ({
        statut: t.statut,
        tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
        tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
        responsablePrincipalId: t.responsablePrincipalId,
        assigneeIds: t.assignees.map((a) => a.userId),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      managerLeaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
    );
    chargeManagersMoyen = Math.round(workload.reduce((s, w) => s + w.tauxOccupation, 0) / workload.length);
  }

  const [partenaireDeps, processusDeps, processusResponsables] = await Promise.all([
    prisma.dependency.findMany({
      where: {
        OR: [
          { sourceType: "Project", sourceId: { in: projectIds }, targetType: { in: ["CrmOrganization", "CrmContact"] } },
          { targetType: "Project", targetId: { in: projectIds }, sourceType: { in: ["CrmOrganization", "CrmContact"] } },
        ],
      },
      select: { sourceType: true, sourceId: true, targetType: true, targetId: true },
    }),
    prisma.dependency.findMany({
      where: {
        OR: [
          { sourceType: "Project", sourceId: { in: projectIds }, targetType: "Processus" },
          { targetType: "Project", targetId: { in: projectIds }, sourceType: "Processus" },
        ],
      },
      select: { sourceType: true, sourceId: true, targetType: true, targetId: true },
    }),
    prisma.processus.findMany({ where: { responsableId: { in: userIds } }, select: { id: true } }),
  ]);
  const partenaireIds = new Set(
    partenaireDeps.map((d) => (d.sourceType === "Project" ? `${d.targetType}:${d.targetId}` : `${d.sourceType}:${d.sourceId}`))
  );
  const processusIds = new Set([
    ...processusDeps.map((d) => (d.sourceType === "Project" ? d.targetId : d.sourceId)),
    ...processusResponsables.map((p) => p.id),
  ]);

  return {
    chargeManagersMoyen,
    partenairesImpactes: partenaireIds.size,
    processusImpactes: processusIds.size,
    indicateursPrevisionnels: indicators.map((i) => ({
      nom: i.nom,
      valeurCible: Number(i.valeurCible),
      valeurActuelle: Number(i.valeurActuelle),
      valeurPrevue: Number(i.valeurActuelle),
    })),
    objectifsTotal,
  };
}

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

  const [pilotage, teamPrediction, advanced] = await Promise.all([
    computeScopePilotage({ userIds, projectIds }),
    computeTeamPrediction(userIds),
    computeAdvancedDimensions(userIds, projectIds, departmentId),
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
    chargeManagersMoyen: advanced.chargeManagersMoyen,
    partenairesImpactes: advanced.partenairesImpactes,
    processusImpactes: advanced.processusImpactes,
    // Par definition, la situation actuelle n'a aucun ecart avec elle-meme.
    impactOrganisationnel: "FAIBLE",
    indicateursPrevisionnels: advanced.indicateursPrevisionnels,
    budgetTotal: pilotage.budgetTotal,
    objectifsTotal: advanced.objectifsTotal,
  };
}

type ImpactFactors = {
  effectifFactor: number;
  projetsFactor: number;
  ressourcesFactor: number;
  // V3.0 §8 — levier "capacité" (disponibilité horaire), distinct de
  // "ressources" (équipement/outillage) mais agissant sur le même facteur
  // de capacité effective. 1 = pas de changement.
  extraCapaciteFactor?: number;
  useAbsolute?: boolean;
  absoluteHeadcountDelta?: number;
  absoluteProjectsDelta?: number;
  sousDotesEnabled?: boolean;
  sousDotesDepartmentId?: string | null;
  // V3.0 §8 — leviers sans traduction dans le modele de pilotage existant :
  // appliques directement en sortie, pas via chargeFactor/capaciteFactor.
  delaisJoursDelta?: number;
  budgetFactor?: number;
  objectifsCountDelta?: number;
};

/**
 * Cœur de projection partagé par computeScenarioImpact (scénarios persistés,
 * V2.2 §14-15 + V3.0 §7) et computeWhatIfImpact (V3.0 §8, ad-hoc, non
 * persisté) — même règle de proportionnalité simple, seule la provenance
 * des facteurs diffère.
 */
async function projectScenarioImpact(baseline: ScenarioImpact, factors: ImpactFactors): Promise<ScenarioImpact> {
  const { effectifFactor, projetsFactor, ressourcesFactor } = factors;
  const extraCapaciteFactor = factors.extraCapaciteFactor ?? 1;

  let headcount = baseline.headcount;
  let projectsTotal = baseline.projectsTotal;
  let projectsActifs = baseline.projectsActifs;

  if (factors.useAbsolute) {
    headcount = baseline.headcount + (factors.absoluteHeadcountDelta ?? 0);
    projectsTotal = baseline.projectsTotal + (factors.absoluteProjectsDelta ?? 0);
    projectsActifs = baseline.projectsActifs + (factors.absoluteProjectsDelta ?? 0);
  } else {
    headcount = Math.round(baseline.headcount * effectifFactor);
    projectsTotal = Math.round(baseline.projectsTotal * projetsFactor);
    projectsActifs = Math.round(baseline.projectsActifs * projetsFactor);
  }

  // Charge ~ proportionnelle au nombre de projets ; capacité effective ~
  // proportionnelle aux effectifs, dégradée si les ressources/capacité
  // baissent.
  const chargeFactor = baseline.projectsTotal > 0 ? projectsTotal / baseline.projectsTotal : projetsFactor;
  const capaciteFactor =
    (baseline.headcount > 0 ? headcount / baseline.headcount : effectifFactor) * ressourcesFactor * extraCapaciteFactor;
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
  if (factors.sousDotesEnabled && ressourcesFactor < 1) {
    const projects = await prisma.project.findMany({
      where: factors.sousDotesDepartmentId
        ? { departmentId: factors.sousDotesDepartmentId, statut: "EN_COURS" }
        : { statut: "EN_COURS" },
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

  // V3.0 §7 — dimensions supplementaires, projetees par le meme principe
  // d'extrapolation simple que le reste du moteur (facteurs deja calcules
  // ci-dessus) plutot qu'un recalcul complet a partir de la base.
  const chargeManagersMoyen =
    baseline.chargeManagersMoyen !== null && capaciteFactor > 0
      ? Math.round(baseline.chargeManagersMoyen * (chargeFactor / capaciteFactor))
      : baseline.chargeManagersMoyen;
  const partenairesImpactes = Math.round(baseline.partenairesImpactes * projetsFactor);
  const processusImpactes = Math.round(baseline.processusImpactes * projetsFactor);
  const indicateursPrevisionnels = baseline.indicateursPrevisionnels.map((i) => ({
    ...i,
    valeurPrevue: Math.round(i.valeurActuelle * projetsFactor * 100) / 100,
  }));

  const projected: ScenarioImpact = {
    headcount,
    projectsTotal,
    projectsActifs,
    tauxOccupationMoyen,
    chargeRepartition,
    risquesCritiques,
    besoinsCompetences,
    projetsSousDotes,
    planningRetardEstimeJours: estimatePlanningRetard(tauxOccupationMoyen) + (factors.delaisJoursDelta ?? 0),
    chargeManagersMoyen,
    partenairesImpactes,
    processusImpactes,
    impactOrganisationnel: "FAIBLE",
    indicateursPrevisionnels,
    budgetTotal: Math.round(baseline.budgetTotal * (factors.budgetFactor ?? 1)),
    objectifsTotal: baseline.objectifsTotal + (factors.objectifsCountDelta ?? 0),
  };
  projected.impactOrganisationnel = classifyOrganizationalImpact(baseline, projected);
  return projected;
}

/**
 * Projette l'impact d'un scénario persisté (V2.2 §14-15) par règle de
 * proportionnalité simple — estimation d'ordre de grandeur, pas une
 * simulation détaillée (présenté comme tel côté UI).
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

  return projectScenarioImpact(baseline, {
    effectifFactor,
    projetsFactor,
    ressourcesFactor,
    useAbsolute: scenario.type === "NOUVELLE_FILIALE",
    absoluteHeadcountDelta: scenario.nouvelleFilialeEffectif ?? 0,
    absoluteProjectsDelta: scenario.nouvelleFilialeProjets ?? 0,
    sousDotesEnabled: scenario.type === "RESSOURCES",
    sousDotesDepartmentId: scenario.departmentId,
  });
}

// ═══════════════════════ V3.0 §8 — What-If Engine ═══════════════════════
// "Permettre à la direction de modifier virtuellement certaines variables"
// puis SIMULER, en comparant Situation actuelle vs Situation simulée — pas
// de scénario persisté (voir Scenario/§14 pour l'équivalent enregistré).
// Réutilise projectScenarioImpact ; seules les variables sans équivalent
// dans le modèle Scenario (capacité, délais, nombre d'agences avec son
// effectif/projets par agence) sont traduites ici en facteurs/deltas.
export type WhatIfInput = {
  departmentId?: string | null;
  deltaEffectifPercent: number;
  deltaRessourcesPercent: number;
  deltaProjetsPercent: number;
  deltaCapacitePercent: number;
  deltaDelaisJours: number;
  deltaBudgetPercent: number;
  deltaObjectifsCount: number;
  nouvellesAgences: number;
  effectifParAgence: number;
  projetsParAgence: number;
};

export async function computeWhatIfImpact(baseline: ScenarioImpact, input: WhatIfInput): Promise<ScenarioImpact> {
  const effectifFactor = 1 + input.deltaEffectifPercent / 100;
  const projetsFactor = 1 + input.deltaProjetsPercent / 100;
  const ressourcesFactor = 1 + input.deltaRessourcesPercent / 100;
  const extraCapaciteFactor = 1 + input.deltaCapacitePercent / 100;
  const budgetFactor = 1 + input.deltaBudgetPercent / 100;
  const useAbsolute = input.nouvellesAgences > 0;

  return projectScenarioImpact(baseline, {
    effectifFactor,
    projetsFactor,
    ressourcesFactor,
    extraCapaciteFactor,
    useAbsolute,
    absoluteHeadcountDelta: input.nouvellesAgences * input.effectifParAgence,
    absoluteProjectsDelta: input.nouvellesAgences * input.projetsParAgence,
    sousDotesEnabled: input.deltaRessourcesPercent < 0,
    sousDotesDepartmentId: input.departmentId,
    delaisJoursDelta: input.deltaDelaisJours,
    budgetFactor,
    objectifsCountDelta: input.deltaObjectifsCount,
  });
}
