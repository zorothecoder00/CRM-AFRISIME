import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { computeEntityScopePilotage } from "@/lib/consolidation";
import { getOrganizationDevise } from "@/lib/currency";

const ACTIVE_TASK_STATUSES = ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"];

export type BenchmarkColumn = { label: string; rows: { label: string; value: string }[] };

// Mis en cache 3 min (revalidate) — meme principe que health-score.ts/
// maturity-assessment.ts (agregat recalcule a chaque comparaison, pas de
// tag par mutation source), mais fenetre plus courte : contrairement a un
// score organisationnel global, une comparaison ad-hoc choisie par
// l'utilisateur (projets/equipes/entites/indicateurs/periodes) affiche des
// champs sensibles a la fraicheur (taches en retard, avancement) qu'on ne
// veut pas voir figes plusieurs minutes apres un changement recent.
// unstable_cache utilise deja les arguments (ids/ranges) comme partie de la
// cle de cache — pas besoin de keyParts explicites, aucune fermeture externe.
const BENCHMARK_REVALIDATE_SECONDS = 180;

/** Comparaison entre projets (cahier des charges V2.2 §25). */
async function benchmarkProjectsUncached(projectIds: string[]): Promise<BenchmarkColumn[]> {
  const [projects, devise] = await Promise.all([
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      include: { tasks: { select: { statut: true, echeance: true } } },
    }),
    getOrganizationDevise(),
  ]);
  const now = new Date();

  return projectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => {
      const enCours = p.tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.statut)).length;
      const enRetard = p.tasks.filter(
        (t) => ACTIVE_TASK_STATUSES.includes(t.statut) && t.echeance !== null && t.echeance < now
      ).length;
      return {
        label: p.nom,
        rows: [
          { label: "Statut", value: p.statut.replace(/_/g, " ") },
          { label: "Avancement", value: `${p.avancement}%` },
          { label: "Budget", value: p.budget !== null ? `${Number(p.budget).toLocaleString("fr-FR")} ${devise}` : "—" },
          { label: "Coût réel", value: p.coutReel !== null ? `${Number(p.coutReel).toLocaleString("fr-FR")} ${devise}` : "—" },
          { label: "Tâches en cours", value: `${enCours}` },
          { label: "Tâches en retard", value: `${enRetard}` },
        ],
      };
    });
}

/** Comparaison entre équipes (cahier des charges V2.2 §25) — charge agrégée via computeWorkload (module 10). */
async function benchmarkTeamsUncached(teamIds: string[]): Promise<BenchmarkColumn[]> {
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    include: { members: { include: { user: { include: { role: true } } } } },
  });

  const results: BenchmarkColumn[] = [];
  for (const teamId of teamIds) {
    const team = teams.find((t) => t.id === teamId);
    if (!team) continue;
    const userIds = team.members.map((m) => m.userId);

    const [tasks, leaves] = await Promise.all([
      userIds.length > 0
        ? prisma.task.findMany({
            where: { OR: [{ responsablePrincipalId: { in: userIds } }, { assignees: { some: { userId: { in: userIds } } } }] },
            include: { assignees: { select: { userId: true } } },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.leave.findMany({ where: { userId: { in: userIds }, statut: "APPROUVE" } })
        : Promise.resolve([]),
    ]);

    const workload = computeWorkload(
      team.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        roleLabel: m.user.role.label,
        capaciteHebdomadaireHeures: Number(m.user.capaciteHebdomadaireHeures),
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

    const tauxMoyen =
      workload.length > 0 ? Math.round(workload.reduce((s, w) => s + w.tauxOccupation, 0) / workload.length) : null;
    const now = new Date();
    const enCours = tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.statut)).length;
    const enRetard = tasks.filter(
      (t) => ACTIVE_TASK_STATUSES.includes(t.statut) && t.echeance !== null && t.echeance < now
    ).length;

    results.push({
      label: team.nom,
      rows: [
        { label: "Membres", value: `${team.members.length}` },
        { label: "Taux d'occupation moyen", value: tauxMoyen !== null ? `${tauxMoyen}%` : "—" },
        { label: "Tâches en cours", value: `${enCours}` },
        { label: "Tâches en retard", value: `${enRetard}` },
      ],
    });
  }
  return results;
}

/**
 * Comparaison entre entités (cahier des charges V2.2 §25, ex. "Togo vs
 * Bénin") — réutilise computeEntityScopePilotage (§24). Devise résolue PAR
 * entité (Entity.devise si renseignée, sinon repli sur la devise globale de
 * l'organisation) plutôt qu'une seule devise partagée pour toutes les
 * colonnes : comparer deux entités qui opèrent dans des devises différentes
 * sous une étiquette unique serait trompeur (cf. src/lib/currency.ts,
 * getDeviseForEntity).
 */
async function benchmarkEntitiesUncached(entityIds: string[]): Promise<BenchmarkColumn[]> {
  const [entities, orgDevise] = await Promise.all([
    prisma.entity.findMany({ where: { id: { in: entityIds } } }),
    getOrganizationDevise(),
  ]);

  const results: BenchmarkColumn[] = [];
  for (const id of entityIds) {
    const entity = entities.find((e) => e.id === id);
    if (!entity) continue;
    const devise = entity.devise || orgDevise;
    const pilotage = await computeEntityScopePilotage(id);
    results.push({
      label: entity.nom,
      rows: [
        { label: "Effectif", value: `${pilotage.headcount}` },
        { label: "Projets actifs", value: `${pilotage.projectsActifs} / ${pilotage.projectsTotal}` },
        { label: "Avancement moyen", value: pilotage.avancementMoyen !== null ? `${pilotage.avancementMoyen}%` : "—" },
        { label: "Budget total", value: `${pilotage.budgetTotal.toLocaleString("fr-FR")} ${devise}` },
        {
          label: "Taux d'occupation moyen",
          value: pilotage.tauxOccupationMoyen !== null ? `${pilotage.tauxOccupationMoyen}%` : "—",
        },
        { label: "Risques critiques", value: `${pilotage.risquesCritiques}` },
      ],
    });
  }
  return results;
}

/**
 * Comparaison entre indicateurs/KPI (cahier des charges V3.0 §32,
 * "Organizational Benchmarking" — complète les 4 axes déjà couverts par
 * V2.2 §25 avec le dernier de la liste du cahier, "indicateurs"). La
 * comparaison "à des références sectorielles" reste hors-scope : le cahier
 * la conditionne lui-même à "des données agrégées et anonymisées [...] si
 * disponibles", et aucune source de ce type n'existe dans l'application.
 */
async function benchmarkIndicatorsUncached(indicatorIds: string[]): Promise<BenchmarkColumn[]> {
  const indicators = await prisma.indicator.findMany({
    where: { id: { in: indicatorIds } },
    include: {
      objective: { select: { titre: true } },
      project: { select: { nom: true } },
      task: { select: { titre: true } },
    },
  });

  return indicatorIds
    .map((id) => indicators.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .map((indicator) => {
      const cible = Number(indicator.valeurCible);
      const actuelle = Number(indicator.valeurActuelle);
      const atteinte = cible !== 0 ? Math.round((actuelle / cible) * 100) : null;
      const contexte = indicator.objective?.titre ?? indicator.project?.nom ?? indicator.task?.titre ?? "—";
      return {
        label: indicator.nom,
        rows: [
          { label: "Contexte", value: contexte },
          { label: "Valeur actuelle", value: `${actuelle}${indicator.unite ?? ""}` },
          { label: "Valeur cible", value: `${cible}${indicator.unite ?? ""}` },
          { label: "Taux d'atteinte", value: atteinte !== null ? `${atteinte}%` : "—" },
        ],
      };
    });
}

/**
 * Comparaison dans le temps (cahier des charges V2.2 §25, ex. "2026 vs
 * 2025") — s'appuie sur MetricSnapshot (module 11), alimenté quotidiennement
 * depuis peu : les périodes anciennes seront clairsemées, le mécanisme reste
 * réel et se densifie avec le temps plutôt que d'être un mock.
 */
async function benchmarkPeriodsUncached(
  ranges: { label: string; start: string; end: string }[]
): Promise<BenchmarkColumn[]> {
  const results: BenchmarkColumn[] = [];
  for (const range of ranges) {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const [avancementSnaps, occupationSnaps] = await Promise.all([
      prisma.metricSnapshot.findMany({
        where: { entityType: "Project", metric: "avancement", capturedAt: { gte: start, lte: end } },
      }),
      prisma.metricSnapshot.findMany({
        where: { entityType: "User", metric: "tauxOccupation", capturedAt: { gte: start, lte: end } },
      }),
    ]);
    const avgAvancement =
      avancementSnaps.length > 0
        ? Math.round(avancementSnaps.reduce((s, x) => s + Number(x.valeur), 0) / avancementSnaps.length)
        : null;
    const avgOccupation =
      occupationSnaps.length > 0
        ? Math.round(occupationSnaps.reduce((s, x) => s + Number(x.valeur), 0) / occupationSnaps.length)
        : null;
    results.push({
      label: range.label,
      rows: [
        { label: "Avancement moyen (projets)", value: avgAvancement !== null ? `${avgAvancement}%` : "Pas de données" },
        { label: "Taux d'occupation moyen", value: avgOccupation !== null ? `${avgOccupation}%` : "Pas de données" },
        { label: "Points de mesure", value: `${avancementSnaps.length + occupationSnaps.length}` },
      ],
    });
  }
  return results;
}

export const benchmarkProjects = unstable_cache(benchmarkProjectsUncached, ["benchmark-projects"], {
  revalidate: BENCHMARK_REVALIDATE_SECONDS,
});
export const benchmarkTeams = unstable_cache(benchmarkTeamsUncached, ["benchmark-teams"], {
  revalidate: BENCHMARK_REVALIDATE_SECONDS,
});
export const benchmarkEntities = unstable_cache(benchmarkEntitiesUncached, ["benchmark-entities"], {
  revalidate: BENCHMARK_REVALIDATE_SECONDS,
});
export const benchmarkIndicators = unstable_cache(benchmarkIndicatorsUncached, ["benchmark-indicators"], {
  revalidate: BENCHMARK_REVALIDATE_SECONDS,
});
export const benchmarkPeriods = unstable_cache(benchmarkPeriodsUncached, ["benchmark-periods"], {
  revalidate: BENCHMARK_REVALIDATE_SECONDS,
});
