import { computeMaturityAssessment, type MaturityDimension } from "@/lib/maturity-assessment";
import { computeSkillsIntelligence } from "@/lib/skills-intelligence";

// AI-Generated Transformation Roadmap (cahier des charges V3.0 §34) — "l'IA
// peut proposer" une feuille de route à partir du diagnostic de maturité
// (§33). Comme pour le Conseiller stratégique (§9) et l'Orchestrateur
// d'agents (§16), aucune clé LLM n'est disponible dans cette instance : la
// proposition est générée par des heuristiques déterministes sur des
// données réelles (dimensions de maturité les plus faibles d'abord, écarts
// de compétences critiques), pas par un vrai modèle génératif.

export type RoadmapInitiative = {
  titre: string;
  dimension: MaturityDimension | "COMPETENCES";
  description: string;
  projetsSuggeres: string[];
  ressources: string;
  kpi: string;
  risques: string[];
  echeance: Date;
};

export type TransformationRoadmap = {
  horizon12Mois: RoadmapInitiative[];
  horizon24Mois: RoadmapInitiative[];
  horizon36Mois: RoadmapInitiative[];
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function computeTransformationRoadmap(): Promise<TransformationRoadmap> {
  const [maturity, skillGaps] = await Promise.all([computeMaturityAssessment(), computeSkillsIntelligence()]);
  const now = new Date();

  // Priorité aux dimensions de maturité les plus faibles (cahier : "12 mois
  // = priorités immédiates" ; les moins critiques glissent vers 36 mois).
  const sorted = [...maturity.dimensions].sort((a, b) => a.score - b.score);
  const bucket12 = sorted.slice(0, 4);
  const bucket24 = sorted.slice(4, 7);
  const bucket36 = sorted.slice(7);

  function toMaturityInitiative(d: (typeof sorted)[number], horizonMonths: number): RoadmapInitiative {
    return {
      titre: `Renforcer : ${d.label}`,
      dimension: d.dimension,
      description: d.recommandation,
      projetsSuggeres: [`Initiative de renforcement — ${d.label}`],
      ressources: "À dimensionner avec le responsable du domaine concerné.",
      kpi: `Score de maturité "${d.label}" (actuellement ${d.score}/100, cible ≥ 70/100)`,
      risques: d.score < 30 ? [`Risque élevé de retard organisationnel si "${d.label}" reste sous 30/100.`] : [],
      echeance: addMonths(now, horizonMonths),
    };
  }

  // Écarts de compétences critiques nécessitant un recrutement — glissés en
  // priorité immédiate (12 mois), le recrutement ayant le délai le plus long.
  const critiqueRecrutement = skillGaps
    .filter((g) => g.recommandation === "RECRUTEMENT" && g.ecart > 0)
    .slice(0, 3)
    .map<RoadmapInitiative>((g) => ({
      titre: `Recruter : compétence "${g.competence}"`,
      dimension: "COMPETENCES",
      description: `Écart de ${g.ecart} sans base interne — recrutement nécessaire.`,
      projetsSuggeres: [`Recrutement — ${g.competence}`],
      ressources: "Budget de recrutement à valider avec la direction.",
      kpi: `Écart de compétence "${g.competence}" (actuellement ${g.ecart})`,
      risques: [`Dépendance à des ressources externes tant que la compétence "${g.competence}" n'est pas couverte en interne.`],
      echeance: addMonths(now, 12),
    }));

  return {
    horizon12Mois: [...bucket12.map((d) => toMaturityInitiative(d, 12)), ...critiqueRecrutement],
    horizon24Mois: bucket24.map((d) => toMaturityInitiative(d, 24)),
    horizon36Mois: bucket36.map((d) => toMaturityInitiative(d, 36)),
  };
}
