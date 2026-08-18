import { prisma } from "@/lib/prisma";
import { objectiveProgress } from "@/lib/objective-progress";

// OKR & Performance Management 3.0 (cahier des charges V3.0 §11) — "le
// systeme doit permettre de suivre la contribution de chaque niveau" de la
// chaine Vision -> Mission -> Axes strategiques -> Objectifs strategiques ->
// OKR -> KPI -> Initiatives -> Projets -> Taches. Aucun nouveau modele :
// StrategicAxis/Objective(parentId, cascade deja modelisee)/Indicator(KPI)/
// Project/Task existent tous deja. "Initiatives" ne devient pas un modele a
// part : le Projet qui porte un objectif EST l'initiative dans ce systeme
// (Objective.projectId), pas de niveau supplementaire fictif.
export type ContributionTask = { id: string; titre: string; statut: string };
export type ContributionKpi = { id: string; nom: string; valeurCible: number; valeurActuelle: number; progressPercent: number };
export type ContributionNode = {
  id: string;
  titre: string;
  statut: string;
  progressPercent: number;
  kpis: ContributionKpi[];
  projet: { id: string; nom: string } | null;
  taches: ContributionTask[];
  enfants: ContributionNode[];
};

async function buildObjectiveNode(objectiveId: string): Promise<ContributionNode> {
  const objective = await prisma.objective.findUniqueOrThrow({
    where: { id: objectiveId },
    include: {
      indicators: { select: { id: true, nom: true, valeurCible: true, valeurActuelle: true } },
      project: { select: { id: true, nom: true } },
      tasks: { select: { id: true, titre: true, statut: true }, take: 10 },
      children: { select: { id: true } },
    },
  });

  const enfants = await Promise.all(objective.children.map((c) => buildObjectiveNode(c.id)));

  let projectTasks: ContributionTask[] = [];
  if (objective.project) {
    const tasks = await prisma.task.findMany({
      where: { projectId: objective.project.id, deletedAt: null },
      select: { id: true, titre: true, statut: true },
      take: 10,
    });
    projectTasks = tasks;
  }
  const taches = [
    ...objective.tasks,
    ...projectTasks.filter((t) => !objective.tasks.some((ot) => ot.id === t.id)),
  ];

  return {
    id: objective.id,
    titre: objective.titre,
    statut: objective.statut,
    progressPercent: objectiveProgress(
      objective.indicators.map((i) => ({ valeurActuelle: Number(i.valeurActuelle), valeurCible: Number(i.valeurCible) }))
    ),
    kpis: objective.indicators.map((i) => ({
      id: i.id,
      nom: i.nom,
      valeurCible: Number(i.valeurCible),
      valeurActuelle: Number(i.valeurActuelle),
      progressPercent: objectiveProgress([{ valeurActuelle: Number(i.valeurActuelle), valeurCible: Number(i.valeurCible) }]),
    })),
    projet: objective.project,
    taches,
    enfants,
  };
}

export type AxisContribution = {
  id: string;
  nom: string;
  vision: string | null;
  mission: string | null;
  objectifs: ContributionNode[];
};

/** Racine = axe stratégique choisi ; ses objectifs de premier niveau (parentId null) portent la cascade OKR. */
export async function buildAxisContribution(axisId: string): Promise<AxisContribution> {
  const [axis, profile] = await Promise.all([
    prisma.strategicAxis.findUniqueOrThrow({
      where: { id: axisId },
      include: { objectives: { where: { parentId: null }, select: { id: true } } },
    }),
    prisma.organizationProfile.findUnique({ where: { id: "org-profile" }, select: { vision: true, mission: true } }),
  ]);

  const objectifs = await Promise.all(axis.objectives.map((o) => buildObjectiveNode(o.id)));

  return { id: axis.id, nom: axis.nom, vision: profile?.vision ?? null, mission: profile?.mission ?? null, objectifs };
}
