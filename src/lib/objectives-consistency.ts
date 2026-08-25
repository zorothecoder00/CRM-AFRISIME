import { prisma } from "@/lib/prisma";

// Contrôle de cohérence entre niveaux (Project Studio §13, Objectives
// Builder) — se limite à la chaîne Objectif général -> spécifique ->
// Résultat (Livrables/Activités/Tâches restent gérés par les modules WBS/
// Task existants, voir la note dans project-objectives-builder.tsx) :
// chaque niveau doit avoir au moins un enfant/livrable pour ne pas être une
// impasse dans la cascade.
export type ConsistencyIssue = { objectiveId: string; titre: string; niveau: string; message: string };

export async function checkObjectivesConsistency(projectId: string): Promise<ConsistencyIssue[]> {
  const objectives = await prisma.objective.findMany({
    where: { projectId, niveau: { not: null } },
    include: { children: true, deliverables: true },
  });

  const issues: ConsistencyIssue[] = [];

  for (const obj of objectives) {
    if (obj.niveau === "GENERAL" && obj.children.length === 0) {
      issues.push({
        objectiveId: obj.id,
        titre: obj.titre,
        niveau: obj.niveau,
        message: "Objectif général sans objectif spécifique associé.",
      });
    }
    if (obj.niveau === "SPECIFIQUE" && obj.children.length === 0) {
      issues.push({
        objectiveId: obj.id,
        titre: obj.titre,
        niveau: obj.niveau,
        message: "Objectif spécifique sans résultat associé.",
      });
    }
    if (obj.niveau === "RESULTAT" && obj.deliverables.length === 0) {
      issues.push({
        objectiveId: obj.id,
        titre: obj.titre,
        niveau: obj.niveau,
        message: "Résultat sans livrable associé.",
      });
    }
  }

  return issues;
}
