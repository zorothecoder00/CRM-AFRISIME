// Score SMART (Project Studio §14) — un booléen par critère ; null (jamais
// évalué) compte comme non satisfait, comme false, pour que le score reflète
// toujours "combien de critères sont confirmés", pas "combien restent à
// évaluer".

export type SmartCriteria = {
  smartSpecifique: boolean | null;
  smartMesurable: boolean | null;
  smartAtteignable: boolean | null;
  smartPertinent: boolean | null;
  smartTemporel: boolean | null;
};

const CRITERIA_LABELS: Record<keyof SmartCriteria, string> = {
  smartSpecifique: "Spécifique",
  smartMesurable: "Mesurable",
  smartAtteignable: "Atteignable",
  smartPertinent: "Pertinent",
  smartTemporel: "Temporellement défini",
};

export function computeSmartScore(objective: SmartCriteria): { score: number; missing: string[] } {
  const keys = Object.keys(CRITERIA_LABELS) as (keyof SmartCriteria)[];
  const satisfied = keys.filter((k) => objective[k] === true);
  const missing = keys.filter((k) => objective[k] !== true).map((k) => CRITERIA_LABELS[k]);
  return { score: Math.round((satisfied.length / keys.length) * 100), missing };
}
