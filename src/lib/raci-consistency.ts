import { prisma } from "@/lib/prisma";

// Controle de coherence RACI (Project Studio §21) — "une personne ne devrait
// pas etre accidentellement Accountable pour plusieurs niveaux incompatibles
// sans alerte configurable". Lecture retenue : une meme personne Accountable
// a la fois sur une activite WBS ET l'un de ses descendants (ex. Accountable
// sur "Phase 1" ET sur "Lot 1.2" qui en depend) — double responsabilite sur
// la meme branche, la source d'incoherence la plus concrete a detecter
// automatiquement plutot qu'un simple seuil arbitraire.
export type RaciConsistencyIssue = {
  userId: string;
  userName: string;
  ancestorSectionId: string;
  ancestorSectionNom: string;
  descendantSectionId: string;
  descendantSectionNom: string;
};

export async function checkRaciConsistency(projectId: string): Promise<RaciConsistencyIssue[]> {
  const [sections, accountableAssignments] = await Promise.all([
    prisma.projectSection.findMany({ where: { projectId }, select: { id: true, nom: true, parentId: true } }),
    prisma.raciAssignment.findMany({
      where: { role: "ACCOUNTABLE", section: { projectId } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const sectionById = new Map(sections.map((s) => [s.id, s]));

  function ancestorsOf(sectionId: string): string[] {
    const result: string[] = [];
    let current = sectionById.get(sectionId);
    while (current?.parentId) {
      result.push(current.parentId);
      current = sectionById.get(current.parentId);
    }
    return result;
  }

  const accountableByUser = new Map<string, typeof accountableAssignments>();
  for (const a of accountableAssignments) {
    const list = accountableByUser.get(a.userId) ?? [];
    list.push(a);
    accountableByUser.set(a.userId, list);
  }

  const issues: RaciConsistencyIssue[] = [];
  for (const [userId, assignments] of accountableByUser) {
    const sectionIds = new Set(assignments.map((a) => a.sectionId));
    for (const a of assignments) {
      for (const ancestorId of ancestorsOf(a.sectionId)) {
        if (sectionIds.has(ancestorId)) {
          issues.push({
            userId,
            userName: assignments[0]!.user.name,
            ancestorSectionId: ancestorId,
            ancestorSectionNom: sectionById.get(ancestorId)?.nom ?? "?",
            descendantSectionId: a.sectionId,
            descendantSectionNom: sectionById.get(a.sectionId)?.nom ?? "?",
          });
        }
      }
    }
  }

  return issues;
}
