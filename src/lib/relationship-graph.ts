import { prisma } from "@/lib/prisma";

export type GraphNode = {
  id: string;
  type: "entityNode";
  position: { x: number; y: number };
  data: { label: string; entityType: string; href?: string };
};
export type GraphEdge = { id: string; source: string; target: string; label?: string };
export type RelationshipGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

// Colonne fixe par type d'entite (pas d'algorithme de layout type dagre
// installe) : suffisant pour un graphe a 2-3 niveaux de profondeur comme
// celui-ci, sans nouvelle dependance de layout.
const COLUMN_X: Record<string, number> = {
  CrmOrganization: 0,
  CrmContact: 280,
  User: 560,
  CrmOpportunity: 560,
  Project: 840,
  CrmInteraction: 840,
  Task: 1120,
};
const ROW_HEIGHT = 90;
const MAX_ITEMS_PER_BRANCH = 10;

function interactionLabel(i: { type: string; dateInteraction: Date }) {
  return `${i.type} — ${i.dateInteraction.toLocaleDateString("fr-FR")}`;
}

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

  result(): RelationshipGraph {
    return { nodes: Array.from(this.nodes.values()), edges: this.edges };
  }
}

/**
 * Relationship Intelligence (V2.2 §12) — parcourt les relations Prisma
 * existantes (aucun modele Contrat/Partenaire n'existe, Meeting n'a aucun
 * lien vers un contact CRM : perimetre limite a ce qui existe reellement,
 * voir la decision de scope validee avec l'utilisateur). Racine =
 * Organisation OU Contact ; format de sortie directement consommable par
 * @xyflow/react.
 */
export async function buildRelationshipGraph(
  rootType: "CrmOrganization" | "CrmContact",
  rootId: string
): Promise<RelationshipGraph> {
  const g = new GraphBuilder();

  if (rootType === "CrmOrganization") {
    const org = await prisma.crmOrganization.findUniqueOrThrow({
      where: { id: rootId },
      include: {
        owner: { select: { id: true, name: true } },
        contacts: { select: { id: true, prenom: true, nom: true, ownerId: true, owner: { select: { id: true, name: true } } } },
        opportunities: {
          take: MAX_ITEMS_PER_BRANCH,
          include: { owner: { select: { id: true, name: true } } },
        },
        interactions: { take: MAX_ITEMS_PER_BRANCH, orderBy: { dateInteraction: "desc" } },
      },
    });

    const orgKey = g.addNode("CrmOrganization", org.id, org.nom, `/crm/organisations/${org.id}`);
    if (org.owner) {
      const ownerKey = g.addNode("User", org.owner.id, org.owner.name);
      g.addEdge(orgKey, ownerKey, "commercial");
    }
    for (const contact of org.contacts) {
      const contactKey = g.addNode("CrmContact", contact.id, `${contact.prenom} ${contact.nom}`, `/crm/contacts/${contact.id}`);
      g.addEdge(orgKey, contactKey, "contact");
      if (contact.owner) {
        const ownerKey = g.addNode("User", contact.owner.id, contact.owner.name);
        g.addEdge(contactKey, ownerKey, "commercial");
      }
    }
    for (const opp of org.opportunities) {
      const oppKey = g.addNode("CrmOpportunity", opp.id, opp.nom, `/crm/opportunites/${opp.id}`);
      g.addEdge(orgKey, oppKey, "opportunité");
      if (opp.owner) {
        const ownerKey = g.addNode("User", opp.owner.id, opp.owner.name);
        g.addEdge(oppKey, ownerKey, "commercial");
      }
    }
    for (const interaction of org.interactions) {
      const key = g.addNode("CrmInteraction", interaction.id, interactionLabel(interaction));
      g.addEdge(orgKey, key, "interaction");
    }
  } else {
    const contact = await prisma.crmContact.findUniqueOrThrow({
      where: { id: rootId },
      include: {
        organization: { select: { id: true, nom: true } },
        owner: { select: { id: true, name: true } },
        opportunities: { take: MAX_ITEMS_PER_BRANCH, include: { owner: { select: { id: true, name: true } } } },
        interactions: { take: MAX_ITEMS_PER_BRANCH, orderBy: { dateInteraction: "desc" } },
        missions: { take: MAX_ITEMS_PER_BRANCH, select: { id: true, titre: true } },
        stakeholderOf: { take: MAX_ITEMS_PER_BRANCH, include: { project: { select: { id: true, nom: true } } } },
      },
    });

    const contactKey = g.addNode("CrmContact", contact.id, `${contact.prenom} ${contact.nom}`, `/crm/contacts/${contact.id}`);
    if (contact.organization) {
      const orgKey = g.addNode("CrmOrganization", contact.organization.id, contact.organization.nom, `/crm/organisations/${contact.organization.id}`);
      g.addEdge(contactKey, orgKey, "organisation");
    }
    if (contact.owner) {
      const ownerKey = g.addNode("User", contact.owner.id, contact.owner.name);
      g.addEdge(contactKey, ownerKey, "commercial");
    }
    for (const opp of contact.opportunities) {
      const oppKey = g.addNode("CrmOpportunity", opp.id, opp.nom, `/crm/opportunites/${opp.id}`);
      g.addEdge(contactKey, oppKey, "opportunité");
      if (opp.owner) {
        const ownerKey = g.addNode("User", opp.owner.id, opp.owner.name);
        g.addEdge(oppKey, ownerKey, "commercial");
      }
    }
    for (const interaction of contact.interactions) {
      const key = g.addNode("CrmInteraction", interaction.id, interactionLabel(interaction));
      g.addEdge(contactKey, key, "interaction");
    }
    for (const stakeholder of contact.stakeholderOf) {
      const projKey = g.addNode("Project", stakeholder.project.id, stakeholder.project.nom, `/projets/${stakeholder.project.id}`);
      g.addEdge(contactKey, projKey, "partie prenante");
    }
    for (const task of contact.missions) {
      const taskKey = g.addNode("Task", task.id, task.titre, `/taches/${task.id}`);
      g.addEdge(contactKey, taskKey, "mission");
    }
  }

  return g.result();
}
