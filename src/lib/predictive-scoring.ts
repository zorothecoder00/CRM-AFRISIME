import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { ACTIVE_TASK_STATUSES } from "@/lib/metric-snapshots";

const TREND_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Trend = "HAUSSE" | "STABLE" | "BAISSE";

/**
 * Intelligence predictive (V2.2 §11) — estimations heuristiques calculees a
 * la volee (pas de modele entraine), a base de regression lineaire simple
 * sur MetricSnapshot pour la tendance, combinee a des facteurs instantanes
 * deja disponibles ailleurs dans l'app (retard, budget, risques,
 * validations). Chaque fonction retourne aussi les facteurs qui composent
 * le score, pour rester transparent plutot qu'une boite noire.
 */
export async function computeTrend(
  entityType: string,
  entityId: string,
  metric: string
): Promise<{ trend: Trend; pointsCount: number }> {
  const since = new Date(Date.now() - TREND_WINDOW_DAYS * DAY_MS);
  const points = await prisma.metricSnapshot.findMany({
    where: { entityType, entityId, metric, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    select: { valeur: true, capturedAt: true },
  });
  if (points.length < 2) return { trend: "STABLE", pointsCount: points.length };

  const xs = points.map((p) => p.capturedAt.getTime());
  const ys = points.map((p) => Number(p.valeur));
  const n = xs.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slopePerDay = den === 0 ? 0 : (num / den) * DAY_MS;
  const scale = Math.max(...ys.map(Math.abs), 1);
  const trend: Trend = Math.abs(slopePerDay) / scale < 0.002 ? "STABLE" : slopePerDay > 0 ? "HAUSSE" : "BAISSE";
  return { trend, pointsCount: n };
}

export type ProjectPrediction = {
  probabiliteRetard: number;
  probabiliteDepassement: number;
  risqueEchec: number;
  facteurs: string[];
};

export async function computeProjectPrediction(projectId: string): Promise<ProjectPrediction> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { avancement: true, budget: true, coutReel: true, dateDebut: true, dateFin: true },
  });
  const [tasks, risks, validationRuns] = await Promise.all([
    prisma.task.findMany({ where: { projectId }, select: { statut: true, echeance: true } }),
    prisma.projectRisk.findMany({
      where: { projectId, statut: { notIn: ["MAITRISE", "CLOS"] } },
      select: { probabilite: true, impact: true },
    }),
    prisma.taskValidationRun.findMany({ where: { task: { projectId } }, select: { statut: true } }),
  ]);

  const facteurs: string[] = [];
  const now = Date.now();

  let tempsEcouleRatio = 0;
  if (project.dateDebut && project.dateFin) {
    const total = project.dateFin.getTime() - project.dateDebut.getTime();
    tempsEcouleRatio = total > 0 ? Math.min(1, Math.max(0, (now - project.dateDebut.getTime()) / total)) : 0;
  }
  const avancementRatio = project.avancement / 100;
  const ecartAvancement = Math.max(0, tempsEcouleRatio - avancementRatio);
  if (ecartAvancement > 0.1) {
    facteurs.push(`avancement ${project.avancement}% pour ${Math.round(tempsEcouleRatio * 100)}% du délai écoulé`);
  }

  const activeTasks = tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.statut));
  const overdueTasks = activeTasks.filter((t) => t.echeance && t.echeance.getTime() < now);
  const blockedTasks = tasks.filter((t) => t.statut === "BLOQUEE");
  if (overdueTasks.length > 0) facteurs.push(`${overdueTasks.length} tâche(s) en retard`);
  if (blockedTasks.length > 0) facteurs.push(`${blockedTasks.length} tâche(s) bloquée(s)`);

  const { trend: avancementTrend } = await computeTrend("Project", projectId, "avancement");
  if (avancementTrend === "BAISSE") facteurs.push("avancement en perte de vitesse");

  let probabiliteRetard = Math.round(
    ecartAvancement * 70 +
      (activeTasks.length > 0 ? (overdueTasks.length / activeTasks.length) * 20 : 0) +
      (blockedTasks.length > 0 ? 10 : 0) +
      (avancementTrend === "BAISSE" ? 10 : 0)
  );
  probabiliteRetard = Math.min(100, probabiliteRetard);

  let probabiliteDepassement = 0;
  if (project.budget !== null && Number(project.budget) > 0) {
    const budgetRatio = (project.coutReel ? Number(project.coutReel) : 0) / Number(project.budget);
    const { trend: budgetTrend } = await computeTrend("Project", projectId, "budgetRatio");
    probabiliteDepassement = Math.round(
      Math.min(100, budgetRatio * 80 + Math.max(0, budgetRatio - tempsEcouleRatio) * 40 + (budgetTrend === "HAUSSE" ? 10 : 0))
    );
    if (budgetTrend === "HAUSSE" && budgetRatio > 0.7) facteurs.push("consommation budgétaire en hausse");
  }

  const rejectedRuns = validationRuns.filter((r) => r.statut === "REJETE").length;
  const tauxRejet = validationRuns.length > 0 ? rejectedRuns / validationRuns.length : 0;
  if (tauxRejet > 0.3) facteurs.push(`${Math.round(tauxRejet * 100)}% des validations rejetées`);

  const risquesCritiques = risks.filter((r) => r.probabilite === "ELEVEE" || r.impact === "ELEVE").length;
  if (risquesCritiques > 0) facteurs.push(`${risquesCritiques} risque(s) critique(s) actif(s)`);

  const risqueEchec = Math.round(
    Math.min(100, probabiliteRetard * 0.35 + probabiliteDepassement * 0.25 + risquesCritiques * 10 + tauxRejet * 100 * 0.15)
  );

  return { probabiliteRetard, probabiliteDepassement, risqueEchec, facteurs };
}

export type ObjectivePrediction = {
  probabiliteAtteinte: number;
  tendance: Trend;
  ecartPrevisionnel: number;
};

export async function computeObjectivePrediction(objectiveId: string): Promise<ObjectivePrediction> {
  const objective = await prisma.objective.findUniqueOrThrow({
    where: { id: objectiveId },
    include: { indicators: { select: { valeurCible: true, valeurActuelle: true } } },
  });
  const cible = objective.indicators.reduce((s, i) => s + Number(i.valeurCible), 0);
  const actuel = objective.indicators.reduce((s, i) => s + Number(i.valeurActuelle), 0);

  const now = Date.now();
  const total = objective.dateFin.getTime() - objective.dateDebut.getTime();
  const tempsEcouleRatio = total > 0 ? Math.min(1, Math.max(0.01, (now - objective.dateDebut.getTime()) / total)) : 1;

  const valeurProjetee = actuel / tempsEcouleRatio;
  const ecartPrevisionnel = Math.round((valeurProjetee - cible) * 100) / 100;
  const probabiliteAtteinte = cible > 0 ? Math.round(Math.min(100, Math.max(0, (valeurProjetee / cible) * 100))) : 0;

  const { trend } = await computeTrend("Objective", objectiveId, "indicatorProgress");

  return { probabiliteAtteinte, tendance: trend, ecartPrevisionnel };
}

export type TeamPrediction = {
  risqueSurcharge: number;
  baisseProductivite: boolean;
  variationProductivitePercent: number | null;
  besoinsCompetences: { competenceId: string; competenceNom: string; demande: number; disponible: number }[];
};

/** Périmètre passé en userIds (résolu par l'appelant via getDepartmentScope/TeamMember, déjà en place). */
export async function computeTeamPrediction(userIds: string[]): Promise<TeamPrediction> {
  if (userIds.length === 0) {
    return { risqueSurcharge: 0, baisseProductivite: false, variationProductivitePercent: null, besoinsCompetences: [] };
  }

  const in14Days = new Date(Date.now() + 14 * DAY_MS);
  const [users, tasks, leaves, userCompetences] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, include: { role: true } }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: { in: userIds } }, { assignees: { some: { userId: { in: userIds } } } }] },
      include: { assignees: { select: { userId: true } }, competencesRequises: { select: { id: true, nom: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE", userId: { in: userIds } } }),
    prisma.userCompetence.findMany({ where: { userId: { in: userIds } }, select: { competenceId: true, niveau: true } }),
  ]);

  const workload = computeWorkload(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
  );
  const tauxOccupationMoyen = workload.length > 0 ? workload.reduce((s, w) => s + w.tauxOccupation, 0) / workload.length : 0;

  const capaciteTotal = users.reduce((s, u) => s + Number(u.capaciteHebdomadaireHeures), 0);
  const heuresAVenir14j = tasks
    .filter((t) => ACTIVE_TASK_STATUSES.includes(t.statut) && t.echeance && t.echeance <= in14Days)
    .reduce((s, t) => s + Number(t.tempsEstimeHeures ?? 0), 0);
  const pressionCourtTerme = capaciteTotal > 0 ? (heuresAVenir14j / capaciteTotal) * 100 : 0;
  const risqueSurcharge = Math.round(Math.min(100, tauxOccupationMoyen * 0.6 + pressionCourtTerme * 0.4));

  const now = Date.now();
  const d14 = now - 14 * DAY_MS;
  const d28 = now - 28 * DAY_MS;
  const completedTasks = await prisma.task.findMany({
    where: {
      statut: "TERMINEE",
      completedAt: { gte: new Date(d28) },
      OR: [{ responsablePrincipalId: { in: userIds } }, { assignees: { some: { userId: { in: userIds } } } }],
    },
    select: { completedAt: true },
  });
  const recentCount = completedTasks.filter((t) => t.completedAt!.getTime() >= d14).length;
  const previousCount = completedTasks.filter((t) => t.completedAt!.getTime() < d14).length;
  const variationProductivitePercent = previousCount > 0 ? Math.round(((recentCount - previousCount) / previousCount) * 100) : null;
  const baisseProductivite = variationProductivitePercent !== null && variationProductivitePercent < -20;

  const demandeMap = new Map<string, { nom: string; count: number }>();
  for (const t of tasks) {
    if (!ACTIVE_TASK_STATUSES.includes(t.statut)) continue;
    for (const c of t.competencesRequises) {
      const cur = demandeMap.get(c.id) ?? { nom: c.nom, count: 0 };
      cur.count++;
      demandeMap.set(c.id, cur);
    }
  }
  const supplyMap = new Map<string, number>();
  for (const uc of userCompetences) {
    if (uc.niveau === "AVANCE" || uc.niveau === "EXPERT") {
      supplyMap.set(uc.competenceId, (supplyMap.get(uc.competenceId) ?? 0) + 1);
    }
  }
  const besoinsCompetences = Array.from(demandeMap.entries())
    .map(([id, { nom, count }]) => ({ competenceId: id, competenceNom: nom, demande: count, disponible: supplyMap.get(id) ?? 0 }))
    .filter((b) => b.disponible < b.demande)
    .sort((a, b) => b.demande - b.disponible - (a.demande - a.disponible));

  return { risqueSurcharge, baisseProductivite, variationProductivitePercent, besoinsCompetences };
}

export type OpportunityPrediction = {
  probabiliteConversion: number;
  risquePerte: number;
  probabiliteRelanceEfficace: number;
  facteurs: string[];
};

export async function computeOpportunityPrediction(opportunityId: string): Promise<OpportunityPrediction> {
  const opp = await prisma.crmOpportunity.findUniqueOrThrow({
    where: { id: opportunityId },
    include: { contact: { select: { score: true } }, interactions: { orderBy: { dateInteraction: "desc" }, take: 5 } },
  });

  const facteurs: string[] = [];
  const { trend } = await computeTrend("CrmOpportunity", opportunityId, "probabilite");

  let probabiliteConversion = opp.probabilite ?? 50;
  if (trend === "HAUSSE") {
    probabiliteConversion = Math.min(100, probabiliteConversion + 10);
    facteurs.push("probabilité en hausse");
  } else if (trend === "BAISSE") {
    probabiliteConversion = Math.max(0, probabiliteConversion - 10);
    facteurs.push("probabilité en baisse");
  }

  const lastInteraction = opp.interactions[0];
  const joursSansInteraction = lastInteraction
    ? Math.floor((Date.now() - lastInteraction.dateInteraction.getTime()) / DAY_MS)
    : null;
  const stagnante = joursSansInteraction === null || joursSansInteraction > 21;
  facteurs.push(joursSansInteraction === null ? "aucune interaction enregistrée" : `${joursSansInteraction} jour(s) sans interaction`);

  const clotureProche =
    opp.dateClotureEstimee !== null &&
    opp.dateClotureEstimee.getTime() > Date.now() &&
    opp.dateClotureEstimee.getTime() - Date.now() < 7 * DAY_MS;
  if (clotureProche) facteurs.push("clôture estimée dans moins de 7 jours");

  const risquePerte = Math.round(
    Math.min(
      100,
      (stagnante ? 40 : 0) + (clotureProche && (opp.probabilite ?? 0) < 50 ? 30 : 0) + (trend === "BAISSE" ? 20 : 0)
    )
  );

  const scoreContact = opp.contact?.score ?? 50;
  const probabiliteRelanceEfficace = Math.round(Math.min(100, scoreContact * 0.6 + Math.min(opp.interactions.length, 5) * 8));

  return {
    probabiliteConversion: Math.round(probabiliteConversion),
    risquePerte,
    probabiliteRelanceEfficace,
    facteurs,
  };
}
