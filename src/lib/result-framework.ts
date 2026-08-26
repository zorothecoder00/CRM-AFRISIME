export type ResultFrameworkTier = {
  key: "IMPACT" | "OUTCOME" | "OUTPUT" | "ACTIVITES" | "TACHES";
  label: string;
  nodeCount: number;
  progression: number | null;
};

/**
 * Result Framework (cahier des charges Project Studio §50) — pyramide
 * Impact → Outcomes → Outputs → Activités → Tâches avec niveau de
 * progression par étage. Réutilise la Théorie du Changement (§11,
 * TheoryOfChangeNode) plutôt qu'un nouveau modèle : chaque nœud peut avoir
 * des sections WBS liées directement (ProjectSection.theoryOfChangeNodeId)
 * et/ou des nœuds enfants via `parentId` (chaîne Activité→Output→Outcome→
 * Impact, §23). La progression remonte des tâches vers le sommet ; un
 * étage sans donnée exploitable (aucune section liée, aucun enfant calculé)
 * reste à `null` plutôt que d'afficher un chiffre inventé.
 */
export function computeResultFramework(input: {
  nodes: { id: string; niveau: string; parentId: string | null; sectionIds: string[] }[];
  tasks: { statut: string; sectionId: string | null }[];
}): ResultFrameworkTier[] {
  const { nodes, tasks } = input;
  const isDone = (statut: string) => statut === "TERMINEE";

  function sectionProgression(sectionIds: string[]): number | null {
    if (sectionIds.length === 0) return null;
    const relevant = tasks.filter((t) => t.sectionId && sectionIds.includes(t.sectionId));
    if (relevant.length === 0) return null;
    const done = relevant.filter((t) => isDone(t.statut)).length;
    return Math.round((done / relevant.length) * 100);
  }

  const memo = new Map<string, number | null>();
  function nodeProgression(nodeId: string): number | null {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    memo.set(nodeId, null); // garde-fou anti-cycle
    const node = nodes.find((n) => n.id === nodeId)!;
    const direct = sectionProgression(node.sectionIds);
    const children = nodes.filter((n) => n.parentId === nodeId);
    const childValues = children
      .map((c) => nodeProgression(c.id))
      .filter((v): v is number => v !== null);
    const childAvg = childValues.length > 0 ? childValues.reduce((a, b) => a + b, 0) / childValues.length : null;

    let result: number | null;
    if (direct !== null && childAvg !== null) result = Math.round((direct + childAvg) / 2);
    else result = direct ?? (childAvg !== null ? Math.round(childAvg) : null);

    memo.set(nodeId, result);
    return result;
  }

  function tier(niveau: string, key: ResultFrameworkTier["key"], label: string): ResultFrameworkTier {
    const nodesAtLevel = nodes.filter((n) => n.niveau === niveau);
    const values = nodesAtLevel.map((n) => nodeProgression(n.id)).filter((v): v is number => v !== null);
    return {
      key,
      label,
      nodeCount: nodesAtLevel.length,
      progression: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    };
  }

  const tachesDone = tasks.filter((t) => isDone(t.statut)).length;
  const tachesTier: ResultFrameworkTier = {
    key: "TACHES",
    label: "Tâches",
    nodeCount: tasks.length,
    progression: tasks.length > 0 ? Math.round((tachesDone / tasks.length) * 100) : null,
  };

  return [
    tier("IMPACT", "IMPACT", "Impact"),
    tier("OUTCOME", "OUTCOME", "Outcomes"),
    tier("OUTPUT", "OUTPUT", "Outputs"),
    tier("ACTIVITE", "ACTIVITES", "Activités"),
    tachesTier,
  ];
}
