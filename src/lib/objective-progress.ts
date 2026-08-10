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
