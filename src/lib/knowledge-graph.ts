import { prisma } from "@/lib/prisma";

export type GraphNode = {
  id: string;
  type: "entityNode";
  position: { x: number; y: number };
  data: { label: string; entityType: string; href?: string };
};
export type GraphEdge = { id: string; source: string; target: string; label?: string };
export type KnowledgeGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

// Moteur distinct de relationship-graph.ts (V2.2 §12, CRM) — choix explicite
// de l'utilisateur : le graphe de connaissances (§27) suit la chaine
// illustree par le cahier des charges (Personne -> travaille sur -> Projet
// -> depend de -> Processus -> produit -> Document -> resulte de ->
// Decision -> prise par -> Instance), qui n'a pas de racine CRM et pas les
// memes types de noeuds/aretes. GraphBuilder duplique volontairement la
// petite classe de relationship-graph.ts plutot que de la partager, pour
// garder les deux graphes independants (meme decision que Digital
// Twin/Knowledge Graph separes).
const COLUMN_X: Record<string, number> = {
  User: 0,
  Project: 280,
  Processus: 560,
  ProcessusDocument: 840,
  GovernanceInstance: 0,
  GovernanceMeeting: 280,
  GovernanceDecision: 560,
  GovernanceMeetingDocument: 840,
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
    const x = COLUMN_X[type] ?? 1120;
    const y = (this.columnCounts.get(type) ?? 0) * ROW_HEIGHT;
    this.columnCounts.set(type, (this.columnCounts.get(type) ?? 0) + 1);
    this.nodes.set(key, { id: key, type: "entityNode", position: { x, y }, data: { label, entityType: type, href } });
    return key;
  }

  addEdge(sourceKey: string, targetKey: string, label?: string) {
    this.edges.push({ id: `${sourceKey}->${targetKey}:${label ?? ""}`, source: sourceKey, target: targetKey, label });
  }

  result(): KnowledgeGraph {
    return { nodes: Array.from(this.nodes.values()), edges: this.edges };
  }
}

export async function buildKnowledgeGraph(
  rootType: "User" | "GovernanceInstance",
  rootId: string
): Promise<KnowledgeGraph> {
  const g = new GraphBuilder();

  if (rootType === "User") {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: rootId },
      include: {
        projectsOwned: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, nom: true } },
        projectMemberships: { take: MAX_ITEMS_PER_BRANCH, select: { project: { select: { id: true, nom: true } } } },
        processusResponsable: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, nom: true } },
        governanceMemberships: {
          take: MAX_ITEMS_PER_BRANCH,
          select: { instance: { select: { id: true, nom: true } } },
        },
      },
    });

    const userKey = g.addNode("User", user.id, user.name);

    const projects = [
      ...user.projectsOwned,
      ...user.projectMemberships.map((m) => m.project),
    ];
    const seenProjects = new Set<string>();
    for (const project of projects) {
      if (seenProjects.has(project.id)) continue;
      seenProjects.add(project.id);
      const projectKey = g.addNode("Project", project.id, project.nom, `/projets/${project.id}`);
      g.addEdge(userKey, projectKey, "travaille sur");

      const dependencies = await prisma.dependency.findMany({
        where: { sourceType: "Project", sourceId: project.id, targetType: "Processus" },
        take: MAX_ITEMS_PER_BRANCH,
      });
      for (const dep of dependencies) {
        const processus = await prisma.processus.findUnique({ where: { id: dep.targetId }, select: { id: true, nom: true, documents: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, nom: true } } } });
        if (!processus) continue;
        const processusKey = g.addNode("Processus", processus.id, processus.nom, `/processus/${processus.id}`);
        g.addEdge(projectKey, processusKey, "dépend de");
        for (const doc of processus.documents) {
          const docKey = g.addNode("ProcessusDocument", doc.id, doc.nom);
          g.addEdge(processusKey, docKey, "produit");
        }
      }
    }

    for (const processus of user.processusResponsable) {
      const processusKey = g.addNode("Processus", processus.id, processus.nom, `/processus/${processus.id}`);
      g.addEdge(userKey, processusKey, "responsable de");
    }

    for (const membership of user.governanceMemberships) {
      const instanceKey = g.addNode("GovernanceInstance", membership.instance.id, membership.instance.nom, `/gouvernance/${membership.instance.id}`);
      g.addEdge(userKey, instanceKey, "membre de");
    }
  } else {
    const instance = await prisma.governanceInstance.findUniqueOrThrow({
      where: { id: rootId },
      include: {
        reunions: {
          take: MAX_ITEMS_PER_BRANCH,
          orderBy: { dateHeure: "desc" },
          include: {
            decisions: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, objet: true } },
            documents: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, nom: true } },
          },
        },
      },
    });

    const instanceKey = g.addNode("GovernanceInstance", instance.id, instance.nom, `/gouvernance/${instance.id}`);
    for (const meeting of instance.reunions) {
      const meetingKey = g.addNode("GovernanceMeeting", meeting.id, meeting.titre, `/gouvernance/reunions/${meeting.id}`);
      g.addEdge(instanceKey, meetingKey, "réunion");
      for (const decision of meeting.decisions) {
        const decisionKey = g.addNode("GovernanceDecision", decision.id, decision.objet);
        g.addEdge(meetingKey, decisionKey, "décision");
        g.addEdge(decisionKey, instanceKey, "prise par");
      }
      for (const doc of meeting.documents) {
        const docKey = g.addNode("GovernanceMeetingDocument", doc.id, doc.nom);
        g.addEdge(meetingKey, docKey, "produit");
      }
    }
  }

  return g.result();
}
