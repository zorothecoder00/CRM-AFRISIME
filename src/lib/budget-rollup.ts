import { prisma } from "@/lib/prisma";

// Budget par activite (Project Studio §23) — agregation prevu/engage/paye
// par activite WBS (ProjectSection), puis remontee vers l'Output/Outcome/
// Impact de la Theory of Change via ProjectSection.theoryOfChangeNodeId et
// TheoryOfChangeNode.parentId.

export type BudgetTotals = { prevu: number; engage: number; paye: number };

export type ActivityBudgetRow = {
  sectionId: string;
  sectionNom: string;
  totals: BudgetTotals;
};

export type ToCNodeBudgetRow = {
  nodeId: string;
  nodeTitre: string;
  niveau: string;
  totals: BudgetTotals;
};

function emptyTotals(): BudgetTotals {
  return { prevu: 0, engage: 0, paye: 0 };
}

function addTotals(a: BudgetTotals, b: BudgetTotals): BudgetTotals {
  return { prevu: a.prevu + b.prevu, engage: a.engage + b.engage, paye: a.paye + b.paye };
}

export async function computeBudgetRollup(projectId: string): Promise<{
  byActivity: ActivityBudgetRow[];
  byToCNode: ToCNodeBudgetRow[];
  projectTotal: BudgetTotals;
}> {
  const [lines, sections, nodes] = await Promise.all([
    prisma.budgetLine.findMany({
      where: { projectId },
      select: { sectionId: true, montantPrevu: true, montantEngage: true, montantPaye: true },
    }),
    prisma.projectSection.findMany({
      where: { projectId },
      select: { id: true, nom: true, theoryOfChangeNodeId: true },
    }),
    prisma.theoryOfChangeNode.findMany({
      where: { projectId },
      select: { id: true, titre: true, niveau: true, parentId: true },
    }),
  ]);

  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const byActivityMap = new Map<string, BudgetTotals>();
  for (const line of lines) {
    if (!line.sectionId) continue;
    const current = byActivityMap.get(line.sectionId) ?? emptyTotals();
    byActivityMap.set(
      line.sectionId,
      addTotals(current, {
        prevu: Number(line.montantPrevu),
        engage: Number(line.montantEngage),
        paye: Number(line.montantPaye),
      })
    );
  }

  const byActivity: ActivityBudgetRow[] = Array.from(byActivityMap.entries()).map(([sectionId, totals]) => ({
    sectionId,
    sectionNom: sectionById.get(sectionId)?.nom ?? "?",
    totals,
  }));

  function ancestorChainOf(nodeId: string): string[] {
    const chain: string[] = [nodeId];
    let current = nodeById.get(nodeId);
    while (current?.parentId) {
      chain.push(current.parentId);
      current = nodeById.get(current.parentId);
    }
    return chain;
  }

  const byToCNodeMap = new Map<string, BudgetTotals>();
  for (const [sectionId, totals] of byActivityMap) {
    const nodeId = sectionById.get(sectionId)?.theoryOfChangeNodeId;
    if (!nodeId) continue;
    for (const ancestorId of ancestorChainOf(nodeId)) {
      const current = byToCNodeMap.get(ancestorId) ?? emptyTotals();
      byToCNodeMap.set(ancestorId, addTotals(current, totals));
    }
  }

  const byToCNode: ToCNodeBudgetRow[] = Array.from(byToCNodeMap.entries()).map(([nodeId, totals]) => ({
    nodeId,
    nodeTitre: nodeById.get(nodeId)?.titre ?? "?",
    niveau: nodeById.get(nodeId)?.niveau ?? "?",
    totals,
  }));

  const projectTotal = lines.reduce(
    (acc, line) =>
      addTotals(acc, {
        prevu: Number(line.montantPrevu),
        engage: Number(line.montantEngage),
        paye: Number(line.montantPaye),
      }),
    emptyTotals()
  );

  return { byActivity, byToCNode, projectTotal };
}
