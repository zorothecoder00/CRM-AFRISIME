import { prisma } from "@/lib/prisma";

// Partner Ecosystem Graph (cahier des charges V3.0 §26) — distinct du
// graphe organisationnel interne (§5, organizational-graph.ts : Direction->
// Equipe->Prestataire->Projet->Objectif) et du graphe relationnel CRM par
// fiche (§12 v2.2, relationship-graph.ts : racine = UN contact/organisation).
// Ici la racine est toujours "l'Organisation" et le graphe montre en une
// seule vue tout l'écosystème externe actif (partenaires, clients,
// institutions/bailleurs, investisseurs) et les projets qui les relient.

export type GraphNode = {
  id: string;
  type: "entityNode";
  position: { x: number; y: number };
  data: { label: string; entityType: string; href?: string };
};
export type GraphEdge = { id: string; source: string; target: string; label?: string };
export type PartnerEcosystemGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

const COLUMN_X: Record<string, number> = { Organisation: 0, CrmContact: 320, Project: 640 };
const ROW_HEIGHT = 90;
const MAX_PROJECTS_PER_CONTACT = 8;

// Types d'acteurs couverts par l'écosystème partenaires (cahier §26 :
// "partenaires, clients, institutions, investisseurs" — fournisseurs/
// consultants/communautés restent dans l'écosystème plus large de §25 mais
// hors du graphe centré partenaires).
const ECOSYSTEM_CONTACT_TYPES = ["PARTENAIRE", "CLIENT", "INVESTISSEUR"] as const;

class GraphBuilder {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private columnCounts = new Map<string, number>();

  addNode(type: string, id: string, label: string, href?: string): string {
    const key = `${type}:${id}`;
    if (this.nodes.has(key)) return key;
    const x = COLUMN_X[type] ?? 960;
    const y = (this.columnCounts.get(type) ?? 0) * ROW_HEIGHT;
    this.columnCounts.set(type, (this.columnCounts.get(type) ?? 0) + 1);
    this.nodes.set(key, { id: key, type: "entityNode", position: { x, y }, data: { label, entityType: type, href } });
    return key;
  }

  addEdge(sourceKey: string, targetKey: string, label?: string) {
    this.edges.push({ id: `${sourceKey}->${targetKey}:${label ?? ""}`, source: sourceKey, target: targetKey, label });
  }

  result(): PartnerEcosystemGraph {
    return { nodes: Array.from(this.nodes.values()), edges: this.edges };
  }
}

export async function buildPartnerEcosystemGraph(): Promise<PartnerEcosystemGraph> {
  const g = new GraphBuilder();

  const [profile, contacts] = await Promise.all([
    prisma.organizationProfile.findUnique({ where: { id: "org-profile" }, select: { nom: true } }),
    prisma.crmContact.findMany({
      where: {
        OR: [
          { type: { in: [...ECOSYSTEM_CONTACT_TYPES] } },
          { organization: { type: "INSTITUTION" } },
        ],
      },
      include: {
        organization: { select: { type: true, nom: true } },
        stakeholderOf: {
          include: { projects: { take: MAX_PROJECTS_PER_CONTACT, include: { project: { select: { id: true, nom: true } } } } },
        },
      },
    }),
  ]);

  const orgKey = g.addNode("Organisation", "org-profile", profile?.nom ?? "Mon organisation");

  for (const contact of contacts) {
    const isBailleur = contact.organization?.type === "INSTITUTION";
    const label = isBailleur ? `${contact.prenom} ${contact.nom} (bailleur)` : `${contact.prenom} ${contact.nom}`;
    const contactKey = g.addNode("CrmContact", contact.id, label, `/crm/contacts/${contact.id}`);
    g.addEdge(orgKey, contactKey, isBailleur ? "bailleur/institution" : contact.type.toLowerCase());

    for (const stakeholder of contact.stakeholderOf) {
      for (const link of stakeholder.projects) {
        const projKey = g.addNode("Project", link.project.id, link.project.nom, `/projets/${link.project.id}`);
        g.addEdge(contactKey, projKey, "projet");
      }
    }
  }

  return g.result();
}

export type PartnerEcosystemAnalysis = {
  partenairesStrategiques: { contactId: string; nom: string; type: string }[];
  relationsCritiques: { contactId: string; nom: string; type: string; raison: string }[];
  risques: { contactId: string; nom: string; type: string; raison: string }[];
  opportunites: { contactId: string; nom: string; opportunite: string; montantEstime: number | null }[];
  dependances: { id: string; direction: "DEPEND_DE" | "DONT_DEPEND" | "LIE_A"; contactId: string; nom: string; autreType: string; autreId: string; autreLabel: string }[];
};

/** Identifie partenaires stratégiques / relations critiques / risques / opportunités / dépendances (cahier §26). */
export async function computePartnerEcosystemAnalysis(): Promise<PartnerEcosystemAnalysis> {
  const contacts = await prisma.crmContact.findMany({
    where: {
      OR: [{ type: { in: [...ECOSYSTEM_CONTACT_TYPES] } }, { organization: { type: "INSTITUTION" } }],
    },
    include: {
      organization: { select: { type: true } },
      stakeholderOf: true,
      opportunities: { where: { statut: { notIn: ["GAGNEE", "PERDUE"] } }, select: { id: true, nom: true, montantEstime: true } },
    },
  });

  const partenairesStrategiques: PartnerEcosystemAnalysis["partenairesStrategiques"] = [];
  const relationsCritiques: PartnerEcosystemAnalysis["relationsCritiques"] = [];
  const risques: PartnerEcosystemAnalysis["risques"] = [];
  const opportunites: PartnerEcosystemAnalysis["opportunites"] = [];

  for (const contact of contacts) {
    const nom = `${contact.prenom} ${contact.nom}`;
    for (const s of contact.stakeholderOf) {
      if (s.influence === "ELEVE" && s.interet === "ELEVE") {
        partenairesStrategiques.push({ contactId: contact.id, nom, type: contact.type });
      }
      if (s.influence === "ELEVE" && s.niveauEngagement === "FAIBLE") {
        relationsCritiques.push({
          contactId: contact.id,
          nom,
          type: contact.type,
          raison: "Forte influence mais faible engagement — à réengager en priorité.",
        });
      }
      if (s.position === "OPPOSANT") {
        risques.push({ contactId: contact.id, nom, type: contact.type, raison: "Position opposante identifiée." });
      }
    }
    if (contact.prochaineRelance && contact.prochaineRelance.getTime() < Date.now()) {
      risques.push({ contactId: contact.id, nom, type: contact.type, raison: "Relance planifiée dépassée — suivi relationnel en retard." });
    }
    for (const opp of contact.opportunities) {
      opportunites.push({
        contactId: contact.id,
        nom,
        opportunite: opp.nom,
        montantEstime: opp.montantEstime !== null ? Number(opp.montantEstime) : null,
      });
    }
  }

  const contactIds = contacts.map((c) => c.id);
  const [depsAsSource, depsAsTarget] = await Promise.all([
    prisma.dependency.findMany({ where: { sourceType: "CrmContact", sourceId: { in: contactIds } } }),
    prisma.dependency.findMany({ where: { targetType: "CrmContact", targetId: { in: contactIds } } }),
  ]);
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const dependances: PartnerEcosystemAnalysis["dependances"] = [];

  for (const dep of depsAsSource) {
    const contact = contactById.get(dep.sourceId);
    if (!contact) continue;
    const label = await resolveEntityLabel(dep.targetType, dep.targetId);
    dependances.push({
      id: dep.id,
      direction: dep.type === "LIE_A" ? "LIE_A" : "DEPEND_DE",
      contactId: contact.id,
      nom: `${contact.prenom} ${contact.nom}`,
      autreType: dep.targetType,
      autreId: dep.targetId,
      autreLabel: label,
    });
  }
  for (const dep of depsAsTarget) {
    const contact = contactById.get(dep.targetId);
    if (!contact) continue;
    const label = await resolveEntityLabel(dep.sourceType, dep.sourceId);
    dependances.push({
      id: dep.id,
      direction: dep.type === "LIE_A" ? "LIE_A" : "DONT_DEPEND",
      contactId: contact.id,
      nom: `${contact.prenom} ${contact.nom}`,
      autreType: dep.sourceType,
      autreId: dep.sourceId,
      autreLabel: label,
    });
  }

  return { partenairesStrategiques, relationsCritiques, risques, opportunites, dependances };
}

async function resolveEntityLabel(type: string, id: string): Promise<string> {
  if (type === "Project") {
    const p = await prisma.project.findUnique({ where: { id }, select: { nom: true } });
    return p?.nom ?? id;
  }
  if (type === "CrmContact") {
    const c = await prisma.crmContact.findUnique({ where: { id }, select: { prenom: true, nom: true } });
    return c ? `${c.prenom} ${c.nom}` : id;
  }
  return id;
}
