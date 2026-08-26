import type { ProjectPilotage } from "@/lib/project-pilotage";

export type RagStatus = "green" | "amber" | "red" | "gray";

/**
 * Project Control Tower (cahier des charges Project Studio §42) — tableau de
 * bord central multi-projets, feux tricolores (rouge/orange/vert/gris "pas
 * de donnée") par dimension. Dérivé des mêmes indicateurs que le Pilotage
 * per-projet (computeProjectPilotage) plutôt que d'inventer un second calcul
 * divergent — voir project-pilotage.ts pour la définition de chaque champ.
 */
export function planningRag(p: ProjectPilotage): RagStatus {
  if (p.delais.statut === "sans_echeance") return "gray";
  return p.delais.statut === "en_retard" ? "red" : "green";
}

export function budgetRag(p: ProjectPilotage): RagStatus {
  if (p.budget.montant === null) return "gray";
  if (p.budget.depasse) return "red";
  if (p.budget.coutReel !== null && p.budget.coutReel >= p.budget.montant * 0.9) return "amber";
  return "green";
}

export function risquesRag(p: ProjectPilotage): RagStatus {
  if (p.risques.total === 0) return "gray";
  if (p.risques.critiques > 0) return "red";
  return p.risques.actifs > 0 ? "amber" : "green";
}

export function qualiteRag(p: ProjectPilotage): RagStatus {
  if (p.qualite.tauxApprobation === null) return "gray";
  if (p.qualite.tauxApprobation >= 80) return "green";
  return p.qualite.tauxApprobation >= 50 ? "amber" : "red";
}

export function livrablesRag(p: ProjectPilotage): RagStatus {
  if (p.livrables.tauxCompletion === null) return "gray";
  if (p.livrables.tauxCompletion >= 80) return "green";
  return p.livrables.tauxCompletion >= 50 ? "amber" : "red";
}

/**
 * Score d'impact : moyenne du taux d'atteinte des indicateurs du projet
 * (valeurActuelle / valeurCible). Seul signal "impact" déjà présent dans le
 * modèle de données tant que le Result Framework (§50) n'existe pas.
 */
export function computeImpactScore(indicators: { valeurCible: number; valeurActuelle: number }[]): number | null {
  const usable = indicators.filter((i) => i.valeurCible > 0);
  if (usable.length === 0) return null;
  const avg = usable.reduce((sum, i) => sum + Math.min(i.valeurActuelle / i.valeurCible, 1.5), 0) / usable.length;
  return Math.round(avg * 100);
}

export function impactRag(score: number | null): RagStatus {
  if (score === null) return "gray";
  if (score >= 80) return "green";
  return score >= 50 ? "amber" : "red";
}

export type ControlTowerRow = {
  id: string;
  nom: string;
  statut: string;
  avancement: number;
  planning: RagStatus;
  budget: RagStatus;
  risques: RagStatus;
  qualite: RagStatus;
  livrables: RagStatus;
  impact: RagStatus;
};
