import { prisma } from "@/lib/prisma";

export type GraphNode = {
  id: string;
  type: "entityNode";
  position: { x: number; y: number };
  data: { label: string; entityType: string; href?: string };
};
export type GraphEdge = { id: string; source: string; target: string; label?: string };
export type OrganizationalGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

// Graphe organisationnel (cahier des charges V3.0 §5) — moteur distinct de
// knowledge-graph.ts (§27, chaine Personne->Projet->Processus->Document-
// >Decision->Instance) et de relationship-graph.ts (§12, CRM). Suit la
// chaine illustree par le cahier : Direction -> depend de -> Equipe ->
// depend de -> Prestataire -> intervient sur -> Projet -> contribue a ->
// Objectif. Departement->Equipe, Departement->Projet et Projet->Objectif
// sont des relations natives (FK) ; Equipe->Prestataire et
// Prestataire->Projet passent par le modele generique Dependency (aucune
// FK native entre Team/CrmContact/Project pour ces paires), meme principe
// que le graphe de connaissances pour Project->Processus.
const COLUMN_X: Record<string, number> = {
  Department: 0,
  Team: 280,
  CrmContact: 560,
  Project: 840,
  Objective: 1120,
};
const ROW_HEIGHT = 90;
const MAX_ITEMS_PER_BRANCH = 10;

class GraphBuilder {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private columnCounts = new Map<string, number>();

  addNode(type: string, id: string, label: string, href?: string): string {
    const key = `${type}:${id}`;
    if (this.nodes.has(key)) return key;
    const x = COLUMN_X[type] ?? 1400;
    const y = (this.columnCounts.get(type) ?? 0) * ROW_HEIGHT;
    this.columnCounts.set(type, (this.columnCounts.get(type) ?? 0) + 1);
    this.nodes.set(key, { id: key, type: "entityNode", position: { x, y }, data: { label, entityType: type, href } });
    return key;
  }

  addEdge(sourceKey: string, targetKey: string, label?: string) {
    this.edges.push({ id: `${sourceKey}->${targetKey}:${label ?? ""}`, source: sourceKey, target: targetKey, label });
  }

  result(): OrganizationalGraph {
    return { nodes: Array.from(this.nodes.values()), edges: this.edges };
  }
}

export async function buildOrganizationalGraph(rootDepartmentId: string): Promise<OrganizationalGraph> {
  const g = new GraphBuilder();

  const department = await prisma.department.findUniqueOrThrow({
    where: { id: rootDepartmentId },
    include: {
      teams: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, nom: true } },
      projects: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, nom: true } },
      objectives: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, titre: true } },
    },
  });

  const departmentKey = g.addNode("Department", department.id, department.name, "/administration/organigramme");

  for (const objective of department.objectives) {
    const objectiveKey = g.addNode("Objective", objective.id, objective.titre, `/objectifs/${objective.id}`);
    g.addEdge(departmentKey, objectiveKey, "contribue à");
  }

  for (const project of department.projects) {
    const projectKey = g.addNode("Project", project.id, project.nom, `/projets/${project.id}`);
    g.addEdge(departmentKey, projectKey, "porte");

    const objectives = await prisma.objective.findMany({
      where: { projectId: project.id },
      take: MAX_ITEMS_PER_BRANCH,
      select: { id: true, titre: true },
    });
    for (const objective of objectives) {
      const objectiveKey = g.addNode("Objective", objective.id, objective.titre, `/objectifs/${objective.id}`);
      g.addEdge(projectKey, objectiveKey, "contribue à");
    }
  }

  for (const team of department.teams) {
    const teamKey = g.addNode("Team", team.id, team.nom, `/administration/equipes/${team.id}`);
    g.addEdge(departmentKey, teamKey, "dépend de");

    const providerDeps = await prisma.dependency.findMany({
      where: { sourceType: "Team", sourceId: team.id, targetType: "CrmContact" },
      take: MAX_ITEMS_PER_BRANCH,
    });
    for (const dep of providerDeps) {
      const provider = await prisma.crmContact.findUnique({
        where: { id: dep.targetId },
        select: { id: true, prenom: true, nom: true },
      });
      if (!provider) continue;
      const providerKey = g.addNode("CrmContact", provider.id, `${provider.prenom} ${provider.nom}`);
      g.addEdge(teamKey, providerKey, "dépend de");

      const projectDeps = await prisma.dependency.findMany({
        where: { sourceType: "CrmContact", sourceId: provider.id, targetType: "Project" },
        take: MAX_ITEMS_PER_BRANCH,
      });
      for (const pDep of projectDeps) {
        const project = await prisma.project.findUnique({ where: { id: pDep.targetId }, select: { id: true, nom: true } });
        if (!project) continue;
        const projectKey = g.addNode("Project", project.id, project.nom, `/projets/${project.id}`);
        g.addEdge(providerKey, projectKey, "intervient sur");

        const objectives = await prisma.objective.findMany({
          where: { projectId: project.id },
          take: MAX_ITEMS_PER_BRANCH,
          select: { id: true, titre: true },
        });
        for (const objective of objectives) {
          const objectiveKey = g.addNode("Objective", objective.id, objective.titre, `/objectifs/${objective.id}`);
          g.addEdge(projectKey, objectiveKey, "contribue à");
        }
      }
    }
  }

  return g.result();
}
