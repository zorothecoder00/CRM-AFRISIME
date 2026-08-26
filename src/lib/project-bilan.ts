import type { ProjectPilotage } from "@/lib/project-pilotage";
import type { ResultFrameworkTier } from "@/lib/result-framework";

function tierProgression(tiers: ResultFrameworkTier[], key: ResultFrameworkTier["key"]): number | null {
  return tiers.find((t) => t.key === key)?.progression ?? null;
}

// ---- §55 Project Health Score ----

export type HealthScoreBreakdown = {
  planning: number;
  budget: number;
  qualite: number;
  risques: number;
  ressources: number;
  livrables: number;
  resultats: number;
  satisfaction: number;
  score: number;
};

function scoreFromOccupation(pct: number): number {
  if (pct <= 100) return 100;
  if (pct <= 130) return Math.round(100 - ((pct - 100) / 30) * 50);
  return 30;
}

/**
 * Project Health Score (cahier des charges Project Studio §55) — score
 * composite 0-100, moyenne non ponderee de 8 dimensions. Une dimension sans
 * donnee retombe sur 70 (neutre) plutot que 0 (qui punirait a tort un projet
 * juste demarre) ou 100 (qui le recompenserait a tort).
 */
export function computeHealthScore(input: {
  pilotage: ProjectPilotage;
  resultFrameworkTiers: ResultFrameworkTier[];
  satisfactionMoyenne: number | null;
}): HealthScoreBreakdown {
  const { pilotage } = input;

  const planning =
    pilotage.delais.statut === "en_retard" ? 40 : pilotage.delais.statut === "a_jour" ? 100 : 70;
  const budget = pilotage.budget.montant === null ? 70 : pilotage.budget.depasse ? 40 : 100;
  const qualite = pilotage.qualite.tauxApprobation ?? 70;
  const risques =
    pilotage.risques.total === 0
      ? 100
      : pilotage.risques.critiques > 0
        ? 30
        : pilotage.risques.actifs > 0
          ? 65
          : 100;
  const ressources =
    pilotage.charge.tauxOccupationMoyen === null ? 70 : scoreFromOccupation(pilotage.charge.tauxOccupationMoyen);
  const livrables = pilotage.livrables.tauxCompletion ?? 70;
  const resultats = tierProgression(input.resultFrameworkTiers, "OUTPUT") ?? 70;
  const satisfaction = input.satisfactionMoyenne !== null ? Math.round((input.satisfactionMoyenne / 5) * 100) : 70;

  const dims = { planning, budget, qualite, risques, ressources, livrables, resultats, satisfaction };
  const score = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / 8);

  return { ...dims, score };
}

// ---- §51 Évaluation du projet (bilan à la clôture) ----

export type AchievementRow = { key: string; label: string; value: string; tone: "success" | "warning" | "danger" | "default" };

export function computeAchievementSummary(input: {
  objectives: { statut: string }[];
  pilotage: ProjectPilotage;
  resultFrameworkTiers: ResultFrameworkTier[];
  satisfactionMoyenne: number | null;
}): AchievementRow[] {
  const { objectives, pilotage } = input;
  const objectifsAtteints = objectives.filter((o) => o.statut === "ATTEINT").length;

  const resultats = tierProgression(input.resultFrameworkTiers, "OUTPUT");
  const effets = tierProgression(input.resultFrameworkTiers, "OUTCOME");
  const impact = tierProgression(input.resultFrameworkTiers, "IMPACT");

  return [
    {
      key: "objectifs",
      label: "Objectifs atteints",
      value: objectives.length > 0 ? `${objectifsAtteints}/${objectives.length}` : "Aucun objectif défini",
      tone: objectives.length === 0 ? "default" : objectifsAtteints === objectives.length ? "success" : objectifsAtteints > 0 ? "warning" : "danger",
    },
    {
      key: "resultats",
      label: "Résultats (outputs)",
      value: resultats !== null ? `${resultats}%` : "Non calculé",
      tone: resultats === null ? "default" : resultats >= 80 ? "success" : resultats >= 50 ? "warning" : "danger",
    },
    {
      key: "effets",
      label: "Effets (outcomes)",
      value: effets !== null ? `${effets}%` : "Non calculé",
      tone: effets === null ? "default" : effets >= 80 ? "success" : effets >= 50 ? "warning" : "danger",
    },
    {
      key: "impact",
      label: "Impact",
      value: impact !== null ? `${impact}%` : "Non calculé",
      tone: impact === null ? "default" : impact >= 80 ? "success" : impact >= 50 ? "warning" : "danger",
    },
    {
      key: "budget",
      label: "Budget",
      value: pilotage.budget.montant === null ? "Non renseigné" : pilotage.budget.depasse ? "Dépassé" : "Respecté",
      tone: pilotage.budget.montant === null ? "default" : pilotage.budget.depasse ? "danger" : "success",
    },
    {
      key: "delais",
      label: "Délais",
      value: pilotage.delais.statut === "sans_echeance" ? "Sans échéance" : pilotage.delais.statut === "en_retard" ? `En retard (${pilotage.delais.joursRetard} j)` : "Respectés",
      tone: pilotage.delais.statut === "en_retard" ? "danger" : pilotage.delais.statut === "a_jour" ? "success" : "default",
    },
    {
      key: "qualite",
      label: "Qualité",
      value: pilotage.qualite.tauxApprobation !== null ? `${pilotage.qualite.tauxApprobation}%` : "Non calculé",
      tone: pilotage.qualite.tauxApprobation === null ? "default" : pilotage.qualite.tauxApprobation >= 80 ? "success" : pilotage.qualite.tauxApprobation >= 50 ? "warning" : "danger",
    },
    {
      key: "risques",
      label: "Risques",
      value: pilotage.risques.total === 0 ? "Aucun risque" : `${pilotage.risques.actifs} actif(s), ${pilotage.risques.critiques} critique(s)`,
      tone: pilotage.risques.critiques > 0 ? "danger" : pilotage.risques.actifs > 0 ? "warning" : "success",
    },
    {
      key: "satisfaction",
      label: "Satisfaction",
      value: input.satisfactionMoyenne !== null ? `${input.satisfactionMoyenne}/5` : "Non renseignée",
      tone: input.satisfactionMoyenne === null ? "default" : input.satisfactionMoyenne >= 4 ? "success" : input.satisfactionMoyenne >= 2.5 ? "warning" : "danger",
    },
  ];
}

// ---- §54 Project Post-Mortem (Prévu vs Réalisé) ----

export type PostMortemRow = { key: string; label: string; prevu: string; realise: string };

export function computePostMortem(input: {
  budget: number | null;
  coutReel: number | null;
  devise: string;
  dateFin: Date | null;
  dateFinReelle: Date | null;
  sections: { statut: string }[];
  pilotage: ProjectPilotage;
  resultFrameworkTiers: ResultFrameworkTier[];
}): PostMortemRow[] {
  const fmt = (n: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${input.devise}`;
  const sectionsTerminees = input.sections.filter((s) => s.statut === "TERMINE").length;

  return [
    {
      key: "cout",
      label: "Coût",
      prevu: input.budget !== null ? fmt(input.budget) : "Non renseigné",
      realise: input.coutReel !== null ? fmt(input.coutReel) : "Non renseigné",
    },
    {
      key: "delai",
      label: "Délai",
      prevu: input.dateFin ? input.dateFin.toLocaleDateString("fr-FR") : "Non renseigné",
      realise: input.dateFinReelle ? input.dateFinReelle.toLocaleDateString("fr-FR") : "Non renseigné",
    },
    {
      key: "portee",
      label: "Portée",
      prevu: `${input.sections.length} activité(s) planifiée(s)`,
      realise: `${sectionsTerminees}/${input.sections.length} terminée(s)`,
    },
    {
      key: "qualite",
      label: "Qualité",
      prevu: "100 %",
      realise: input.pilotage.qualite.tauxApprobation !== null ? `${input.pilotage.qualite.tauxApprobation}%` : "Non calculé",
    },
    {
      key: "resultats",
      label: "Résultats",
      prevu: "100 %",
      realise: (() => {
        const v = tierProgression(input.resultFrameworkTiers, "OUTPUT");
        return v !== null ? `${v}%` : "Non calculé";
      })(),
    },
    {
      key: "impact",
      label: "Impact",
      prevu: "100 %",
      realise: (() => {
        const v = tierProgression(input.resultFrameworkTiers, "IMPACT");
        return v !== null ? `${v}%` : "Non calculé";
      })(),
    },
  ];
}
