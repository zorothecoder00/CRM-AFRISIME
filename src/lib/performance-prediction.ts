import { prisma } from "@/lib/prisma";
import { computeObjectiveProgress } from "@/lib/objective-progress";
import { computeWorkload } from "@/lib/workload";

export type PerformancePrediction = {
  progressionActuelle: number;
  previsionIA: number;
  probabiliteAtteinte: number;
  facteurs: string[];
};

// Performance Prediction (cahier des charges V3.0 §12) — étend la
// prédiction déjà en place (V2.2 §11, computeObjectivePrediction dans
// predictive-scoring.ts) sans la modifier (page /predictions et consommateurs
// existants inchangés) : le cahier distingue ici 3 valeurs (progression
// actuelle, prévision IA par extrapolation linéaire, probabilité d'atteinte
// ajustée par des facteurs de risque), alors que l'existant n'en calculait
// que 2 (probabiliteAtteinte y confondait déjà prévision et probabilité).
// "Explique les facteurs" (`facteurs`) est la vraie nouveauté du §12.
export async function predictObjectivePerformance(objectiveId: string): Promise<PerformancePrediction> {
  const objective = await prisma.objective.findUniqueOrThrow({
    where: { id: objectiveId },
    include: {
      indicators: { select: { valeurCible: true, valeurActuelle: true } },
      project: { select: { id: true } },
    },
  });

  const { progressRatio, timeElapsedRatio, ecart } = computeObjectiveProgress({
    dateDebut: objective.dateDebut,
    dateFin: objective.dateFin,
    indicators: objective.indicators.map((i) => ({ valeurCible: Number(i.valeurCible), valeurActuelle: Number(i.valeurActuelle) })),
  });

  const progressionActuelle = Math.round(progressRatio * 100);
  const previsionIA = timeElapsedRatio > 0 ? Math.round(Math.min(150, (progressRatio / timeElapsedRatio) * 100)) : progressionActuelle;

  const facteurs: string[] = [
    `Progression actuelle : ${progressionActuelle}% pour ${Math.round(timeElapsedRatio * 100)}% du temps écoulé.`,
  ];
  let penalite = 0;

  if (ecart > 0.15) {
    penalite += 15;
    facteurs.push("Retard significatif sur l'échéancier par rapport au temps déjà écoulé.");
  }

  if (objective.project) {
    const openRisks = await prisma.projectRisk.count({
      where: { projectId: objective.project.id, statut: { not: "CLOS" } },
    });
    if (openRisks > 0) {
      penalite += Math.min(20, openRisks * 5);
      facteurs.push(`${openRisks} risque(s) ouvert(s) sur le projet lié.`);
    }
  }

  if (objective.userId) {
    const user = await prisma.user.findUnique({
      where: { id: objective.userId },
      select: { id: true, name: true, capaciteHebdomadaireHeures: true, role: { select: { label: true } } },
    });
    if (user) {
      const tasks = await prisma.task.findMany({
        where: {
          deletedAt: null,
          OR: [{ responsablePrincipalId: user.id }, { assignees: { some: { userId: user.id } } }],
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
      });
      const [workload] = computeWorkload(
        [{ id: user.id, name: user.name, roleLabel: user.role.label, capaciteHebdomadaireHeures: Number(user.capaciteHebdomadaireHeures) }],
        tasks.map((t) => ({
          statut: t.statut,
          tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
          tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
          responsablePrincipalId: t.responsablePrincipalId,
          assigneeIds: t.assignees.map((a) => a.userId),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        []
      );
      if (workload?.enSurcharge) {
        penalite += 10;
        facteurs.push(`${user.name} (responsable) est actuellement en surcharge de travail.`);
      }
    }
  }

  const probabiliteAtteinte = Math.max(0, Math.min(100, previsionIA - penalite));
  if (facteurs.length === 1) facteurs.push("Aucun facteur de risque supplémentaire détecté.");

  return { progressionActuelle, previsionIA, probabiliteAtteinte, facteurs };
}
