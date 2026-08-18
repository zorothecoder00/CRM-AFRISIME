import { prisma } from "@/lib/prisma";
import { computeCriticite } from "@/lib/risk-matrix";
import { getDependenciesFor, resolveDependencyLabels } from "@/lib/dependencies";

export type ImpactLevel = "FAIBLE" | "MOYEN" | "ELEVE";

export type ImpactAnalysis = {
  level: ImpactLevel;
  consequences: string[];
  projetsAffectes: { id: string; nom: string }[];
  tachesAffectees: { id: string; titre: string }[];
  competencesPerdues: { id: string; nom: string }[];
  processusConcernes: { id: string; nom: string }[];
  clientsConcernes: { id: string; nom: string }[];
  risques: { id: string; titre: string; criticite: string }[];
  dependances: { label: string; direction: "amont" | "aval" }[];
  objectifsMenaces: { id: string; titre: string }[];
};

const CRITICITE_WEIGHT: Record<string, number> = { FAIBLE: 0, MODERE: 1, IMPORTANT: 2, ELEVE: 3, CRITIQUE: 4 };

function levelFromScore(score: number): ImpactLevel {
  if (score >= 12) return "ELEVE";
  if (score >= 5) return "MOYEN";
  return "FAIBLE";
}

// Analyse d'impact (cahier des charges V3.0 §6) — "avant une modification
// importante, le systeme doit pouvoir analyser son impact". Scope MVP :
// suppression d'une equipe (l'exemple detaille par le cahier). Reutilise
// entierement les modeles/moteurs existants (Dependency via
// getDependenciesFor, criticite via risk-matrix) — aucun nouveau modele.
export async function analyzeTeamDeletionImpact(teamId: string): Promise<ImpactAnalysis> {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { members: { select: { userId: true } } },
  });
  const memberIds = team.members.map((m) => m.userId);

  const [assignedTasks, ownedTasks, competences, processusResponsable, clientContacts, dependencies] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null, assignees: { some: { userId: { in: memberIds } } } },
      select: { id: true, titre: true, projectId: true },
    }),
    prisma.task.findMany({
      where: { deletedAt: null, responsablePrincipalId: { in: memberIds } },
      select: { id: true, titre: true, projectId: true },
    }),
    prisma.userCompetence.findMany({
      where: { userId: { in: memberIds } },
      select: { competence: { select: { id: true, nom: true } } },
      distinct: ["competenceId"],
    }),
    prisma.processus.findMany({
      where: { responsableId: { in: memberIds } },
      select: { id: true, nom: true },
    }),
    prisma.crmContact.findMany({
      where: { ownerId: { in: memberIds }, type: "CLIENT" },
      select: { id: true, prenom: true, nom: true },
    }),
    getDependenciesFor("Team", teamId),
  ]);

  const tachesById = new Map<string, { id: string; titre: string }>();
  const projectIds = new Set<string>();
  for (const t of [...assignedTasks, ...ownedTasks]) {
    tachesById.set(t.id, { id: t.id, titre: t.titre });
    if (t.projectId) projectIds.add(t.projectId);
  }

  const [projects, risksAndObjectives] = await Promise.all([
    prisma.project.findMany({ where: { id: { in: Array.from(projectIds) } }, select: { id: true, nom: true } }),
    Promise.all([
      prisma.projectRisk.findMany({
        where: { projectId: { in: Array.from(projectIds) }, statut: { not: "CLOS" } },
        select: { id: true, titre: true, probabilite: true, impact: true },
      }),
      prisma.organizationalRisk.findMany({
        where: { projectId: { in: Array.from(projectIds) }, statut: { not: "CLOS" } },
        select: { id: true, titre: true, criticite: true },
      }),
      prisma.objective.findMany({
        where: {
          OR: [{ projectId: { in: Array.from(projectIds) } }, { departmentId: team.departmentId }],
          statut: "EN_COURS",
        },
        select: { id: true, titre: true },
      }),
    ]),
  ]);
  const [projectRisks, orgRisks, objectifsMenaces] = risksAndObjectives;

  const risques = [
    ...projectRisks.map((r) => ({ id: r.id, titre: r.titre, criticite: computeCriticite(r.probabilite, r.impact) })),
    ...orgRisks.map((r) => ({ id: r.id, titre: r.titre, criticite: r.criticite })),
  ];

  const depLabels = await resolveDependencyLabels([
    ...dependencies.upstream.map((d) => ({ type: d.sourceType, id: d.sourceId })),
    ...dependencies.downstream.map((d) => ({ type: d.targetType, id: d.targetId })),
  ]);
  const dependances = [
    ...dependencies.upstream.map((d) => ({
      label: `${d.targetType} : ${depLabels.get(`${d.targetType}:${d.targetId}`) ?? d.targetId}`,
      direction: "aval" as const,
    })),
    ...dependencies.downstream.map((d) => ({
      label: `${d.sourceType} : ${depLabels.get(`${d.sourceType}:${d.sourceId}`) ?? d.sourceId}`,
      direction: "amont" as const,
    })),
  ];

  const criticiteScore = risques.reduce((sum, r) => sum + (CRITICITE_WEIGHT[r.criticite] ?? 0), 0);
  const score =
    projects.length * 3 +
    tachesById.size * 0.5 +
    competences.length * 1 +
    processusResponsable.length * 2 +
    clientContacts.length * 2 +
    criticiteScore +
    dependances.length * 1.5 +
    objectifsMenaces.length * 3;
  const level = levelFromScore(score);

  const consequences: string[] = [];
  if (projects.length > 0) consequences.push(`${projects.length} projet(s) affecté(s) : ${projects.map((p) => p.nom).join(", ")}.`);
  if (tachesById.size > 0) consequences.push(`${tachesById.size} tâche(s) en cours perdent leur assignation.`);
  if (competences.length > 0) consequences.push(`${competences.length} compétence(s) ne seront plus couvertes par l'équipe.`);
  if (processusResponsable.length > 0) consequences.push(`${processusResponsable.length} processus perdent leur responsable.`);
  if (clientContacts.length > 0) consequences.push(`${clientContacts.length} client(s) géré(s) par l'équipe sans repreneur désigné.`);
  if (risques.length > 0) consequences.push(`${risques.length} risque(s) ouvert(s) sur le périmètre affecté.`);
  if (objectifsMenaces.length > 0) consequences.push(`${objectifsMenaces.length} objectif(s) menacé(s) sur le périmètre affecté.`);
  if (dependances.length > 0) consequences.push(`${dependances.length} dépendance(s) enregistrée(s) impliquant cette équipe.`);
  if (consequences.length === 0) consequences.push("Aucune conséquence significative détectée.");

  return {
    level,
    consequences,
    projetsAffectes: projects,
    tachesAffectees: Array.from(tachesById.values()),
    competencesPerdues: competences.map((c) => c.competence),
    processusConcernes: processusResponsable,
    clientsConcernes: clientContacts.map((c) => ({ id: c.id, nom: `${c.prenom} ${c.nom}` })),
    risques,
    dependances,
    objectifsMenaces,
  };
}
