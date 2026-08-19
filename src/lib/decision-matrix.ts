const QUALITATIF_SCORE_ASC: Record<string, number> = { FAIBLE: 0, MOYEN: 50, ELEVE: 100 };
const QUALITATIF_SCORE_DESC: Record<string, number> = { FAIBLE: 100, MOYEN: 50, ELEVE: 0 };

export type DecisionOptionInput = {
  id: string;
  nom: string;
  cout: number | null;
  delaiJours: number | null;
  risque: string;
  impact: string;
  ressources: number | null;
  roiPercent: number | null;
  faisabilite: string;
};

export type DecisionWeights = {
  poidsCout: number;
  poidsDelai: number;
  poidsRisque: number;
  poidsImpact: number;
  poidsRessources: number;
  poidsRoi: number;
  poidsFaisabilite: number;
};

export type DecisionScore = { optionId: string; nom: string; score: number; details: Record<string, number> };

/**
 * Recommandation de matrice de décision (cahier des charges V2.2 §41) —
 * normalise chaque critère numérique en 0-100 par min-max au sein de
 * l'ensemble des options (coût/délai/ressources : plus bas = meilleur ; ROI :
 * plus haut = meilleur), et chaque critère qualitatif via une échelle fixe
 * à 3 niveaux (risque : plus faible = meilleur ; impact/faisabilité : plus
 * élevé = meilleur — "impact" désigne le bénéfice attendu de l'option, pas
 * un risque). Combine ensuite via une moyenne pondérée simple (pas de
 * modèle appris — une heuristique explicite, comme le moteur de
 * priorisation §40).
 */
function normalizeAsc(values: (number | null)[]): number[] {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return values.map(() => 50);
  const min = Math.min(...known);
  const max = Math.max(...known);
  return values.map((v) => (v === null ? 50 : max === min ? 100 : ((v - min) / (max - min)) * 100));
}

function normalizeDesc(values: (number | null)[]): number[] {
  return normalizeAsc(values).map((s) => 100 - s);
}

export function computeDecisionRecommendation(
  options: DecisionOptionInput[],
  weights: DecisionWeights
): DecisionScore[] {
  if (options.length === 0) return [];

  const coutScores = normalizeDesc(options.map((o) => o.cout));
  const delaiScores = normalizeDesc(options.map((o) => o.delaiJours));
  const ressourcesScores = normalizeDesc(options.map((o) => o.ressources));
  const roiScores = normalizeAsc(options.map((o) => o.roiPercent));

  const totalWeight =
    weights.poidsCout +
    weights.poidsDelai +
    weights.poidsRisque +
    weights.poidsImpact +
    weights.poidsRessources +
    weights.poidsRoi +
    weights.poidsFaisabilite || 1;

  return options
    .map((o, i) => {
      const details = {
        cout: coutScores[i],
        delai: delaiScores[i],
        risque: QUALITATIF_SCORE_DESC[o.risque] ?? 50,
        impact: QUALITATIF_SCORE_ASC[o.impact] ?? 50,
        ressources: ressourcesScores[i],
        roi: roiScores[i],
        faisabilite: QUALITATIF_SCORE_ASC[o.faisabilite] ?? 50,
      };
      const score =
        (details.cout * weights.poidsCout +
          details.delai * weights.poidsDelai +
          details.risque * weights.poidsRisque +
          details.impact * weights.poidsImpact +
          details.ressources * weights.poidsRessources +
          details.roi * weights.poidsRoi +
          details.faisabilite * weights.poidsFaisabilite) /
        totalWeight;
      return { optionId: o.id, nom: o.nom, score: Math.round(score), details };
    })
    .sort((a, b) => b.score - a.score);
}

const CRITERE_LABELS: Record<string, string> = {
  cout: "coût",
  delai: "délai",
  risque: "risque",
  impact: "impact",
  ressources: "ressources",
  roi: "ROI",
  faisabilite: "faisabilité",
};

/**
 * Decision Simulator (cahier des charges V3.0 §38) — "fournit une
 * recommandation avec justification, et non une décision automatique" :
 * transforme le score numérique déjà calculé en une phrase explicative,
 * sans rien décider ni exécuter à la place de l'utilisateur.
 */
export function buildDecisionJustification(scores: DecisionScore[]): string | null {
  if (scores.length === 0) return null;
  const [top, runnerUp] = scores;

  const topStrengths = Object.entries(top.details)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => CRITERE_LABELS[k] ?? k);

  if (!runnerUp) {
    return `« ${top.nom} » est la seule option évaluée (score ${top.score}/100), portée par : ${topStrengths.join(" et ")}.`;
  }

  const ecart = top.score - runnerUp.score;
  if (ecart < 5) {
    return `« ${top.nom} » et « ${runnerUp.nom} » sont quasi équivalentes (${top.score} vs ${runnerUp.score}/100) — l'écart est trop faible pour trancher sur les seuls critères chiffrés ; un arbitrage humain est recommandé.`;
  }

  return `« ${top.nom} » est recommandée (${top.score}/100, +${ecart} points sur « ${runnerUp.nom} »), principalement grâce à : ${topStrengths.join(" et ")}.`;
}
