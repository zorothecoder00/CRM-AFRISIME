import type { AutomationConditionConnector, AutomationConditionOperator } from "@/generated/prisma/enums";

/**
 * Evaluation des conditions d'une regle (V2.2 §7.2 — IF/ELSE/AND/OR), ex.
 * « SI projet critique ET retard > 3 jours ALORS notifier le directeur ».
 * Sequentielle gauche->droite dans l'ordre des conditions, sans
 * parenthesage (cf. commentaire deja present sur le moteur "comme
 * Zapier/IFTTT"). `champ` est une cle libre resolue dans le
 * `conditionData` que chaque run*Rules() (src/lib/automation.ts) construit
 * a partir de l'entite deja chargee — pas de requete DB supplementaire ici.
 */
export type ConditionInput = {
  champ: string;
  operateur: AutomationConditionOperator;
  valeur: string;
  connecteur: AutomationConditionConnector;
  ordre: number;
};

export type ConditionData = Record<string, string | number | boolean | null | undefined>;

function compare(actual: ConditionData[string], operateur: AutomationConditionOperator, valeur: string): boolean {
  switch (operateur) {
    case "EQUALS":
      return String(actual ?? "") === valeur;
    case "NOT_EQUALS":
      return String(actual ?? "") !== valeur;
    case "GREATER_THAN":
      return Number(actual) > Number(valeur);
    case "LESS_THAN":
      return Number(actual) < Number(valeur);
    case "CONTAINS":
      return String(actual ?? "").toLowerCase().includes(valeur.toLowerCase());
  }
}

export function evaluateConditions(conditions: ConditionInput[], data: ConditionData): boolean {
  if (conditions.length === 0) return true;

  const sorted = [...conditions].sort((a, b) => a.ordre - b.ordre);
  let result = compare(data[sorted[0].champ], sorted[0].operateur, sorted[0].valeur);
  for (let i = 1; i < sorted.length; i++) {
    const current = compare(data[sorted[i].champ], sorted[i].operateur, sorted[i].valeur);
    result = sorted[i - 1].connecteur === "OU" ? result || current : result && current;
  }
  return result;
}

/**
 * Champs proposes dans l'editeur de conditions (UI) par type d'entite
 * declenchante — purement declaratif, doit rester coherent avec les
 * `conditionData` construits dans src/lib/automation.ts.
 */
export const CONDITION_FIELDS_BY_ENTITY: Record<string, { value: string; label: string }[]> = {
  Task: [
    { value: "task.retardJours", label: "Retard de la tâche (jours)" },
    { value: "task.priorite", label: "Priorité de la tâche" },
    { value: "task.projetCritique", label: "Le projet est critique (true/false)" },
  ],
  Project: [
    { value: "project.critique", label: "Le projet est critique (true/false)" },
    { value: "project.retardJours", label: "Retard du projet (jours)" },
    { value: "project.budgetDepasse", label: "Budget dépassé (true/false)" },
    { value: "project.statut", label: "Statut du projet" },
  ],
  ProjectRisk: [
    { value: "risk.probabilite", label: "Probabilité du risque" },
    { value: "risk.impact", label: "Impact du risque" },
  ],
  OrganizationalRisk: [
    { value: "risk.criticite", label: "Criticité du risque" },
  ],
  CrmOpportunity: [
    { value: "opportunity.probabilite", label: "Probabilité de l'opportunité (%)" },
    { value: "opportunity.montantEstime", label: "Montant estimé" },
  ],
  Indicator: [
    { value: "indicator.ecartPourcent", label: "Écart cible/actuel (%)" },
  ],
};
