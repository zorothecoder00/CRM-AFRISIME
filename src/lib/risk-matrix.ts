import type { RiskProbability, RiskImpact, RiskCriticite } from "@/generated/prisma/enums";

const PROBABILITE_SCORE: Record<RiskProbability, number> = {
  FAIBLE: 1,
  MOYENNE: 2,
  ELEVEE: 3,
};

const IMPACT_SCORE: Record<RiskImpact, number> = {
  FAIBLE: 1,
  MOYEN: 2,
  ELEVE: 3,
};

/**
 * Matrice probabilité x impact (cahier des charges v2 §5.2) : la somme des
 * deux scores (2 à 6) tombe exactement sur 5 valeurs distinctes, une par
 * niveau de criticité — pas de zone d'ambiguïté à trancher arbitrairement.
 */
export function computeCriticite(probabilite: RiskProbability, impact: RiskImpact): RiskCriticite {
  const score = PROBABILITE_SCORE[probabilite] + IMPACT_SCORE[impact];
  const byScore: Record<number, RiskCriticite> = {
    2: "FAIBLE",
    3: "MODERE",
    4: "IMPORTANT",
    5: "ELEVE",
    6: "CRITIQUE",
  };
  return byScore[score];
}
