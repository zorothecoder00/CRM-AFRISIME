// Score de risque (Project Studio §28) — probabilite x impact sur une
// echelle 1-3 chacun, score 1-9. Calcule a la volee plutot que stocke : la
// matrice ne doit jamais se desynchroniser des deux champs sources.

const LEVEL_VALUE: Record<string, number> = {
  FAIBLE: 1,
  MOYEN: 2,
  MOYENNE: 2,
  ELEVE: 3,
  ELEVEE: 3,
};

export function computeRiskScore(probabilite: string, impact: string): number {
  return (LEVEL_VALUE[probabilite.toUpperCase()] ?? 2) * (LEVEL_VALUE[impact.toUpperCase()] ?? 2);
}

export function riskScoreSeverity(score: number): "FAIBLE" | "MOYEN" | "ELEVE" {
  if (score >= 6) return "ELEVE";
  if (score >= 3) return "MOYEN";
  return "FAIBLE";
}
