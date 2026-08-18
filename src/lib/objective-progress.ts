export function indicatorProgress(valeurActuelle: number, valeurCible: number): number {
  if (valeurCible === 0) return 0;
  return Math.min(100, Math.round((valeurActuelle / valeurCible) * 100));
}

export function objectiveProgress(
  indicators: { valeurActuelle: number; valeurCible: number }[]
): number {
  if (indicators.length === 0) return 0;
  const total = indicators.reduce(
    (sum, i) => sum + indicatorProgress(i.valeurActuelle, i.valeurCible),
    0
  );
  return Math.round(total / indicators.length);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Ratio d'avancement temporel [0,1] d'une période dateDebut→dateFin, à la date courante. */
export function timeElapsedRatio(dateDebut: Date, dateFin: Date): number {
  const total = dateFin.getTime() - dateDebut.getTime();
  if (total <= 0) return 1;
  return clamp01((Date.now() - dateDebut.getTime()) / total);
}

export type ObjectiveTimelineProgress = { progressRatio: number; timeElapsedRatio: number; ecart: number };

/**
 * Avancement réel (via objectiveProgress ci-dessus) vs avancement temporel
 * attendu — utilisé par le Conseiller stratégique (V3.0 §9, "objectifs les
 * moins susceptibles d'être atteints") et le Strategy Copilot (V3.0 §10,
 * "analyse des écarts"/"suivi stratégique"). ecart > 0 = l'objectif est en
 * retard sur son échéancier.
 */
export function computeObjectiveProgress(objective: {
  dateDebut: Date;
  dateFin: Date;
  indicators: { valeurCible: number; valeurActuelle: number }[];
}): ObjectiveTimelineProgress {
  const elapsed = timeElapsedRatio(objective.dateDebut, objective.dateFin);
  const progress = clamp01(objectiveProgress(objective.indicators) / 100);
  return { progressRatio: progress, timeElapsedRatio: elapsed, ecart: elapsed - progress };
}
