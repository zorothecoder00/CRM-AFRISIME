import { prisma } from "@/lib/prisma";

// Jumeau numerique organisationnel (cahier des charges V2.2 §26) — pas un
// graphe visuel (choix explicite de l'utilisateur, distinct de §27 Knowledge
// Graph) mais un tableau de bord de synthese qui agrege, domaine par
// domaine, les modeles deja existants dans l'app (aucun nouveau modele :
// personnes=User, equipes=Team, structures=Department/Entity,
// projets=Project, processus=Processus, ressources=ProjectResource,
// objectifs=Objective, risques=ProjectRisk+OrganizationalRisk,
// relations=Stakeholder+Dependency, decisions=MeetingDecision+
// GovernanceDecision). Le "comment les composantes s'influencent
// mutuellement" (objectif du §26) est rendu par la section "liens
// inter-domaines", qui reutilise directement le modele Dependency generique
// (V2.2 §13) — deja le seul endroit ou des influences croisees entre types
// d'entites differents sont enregistrees.
export type DigitalTwinSnapshot = {
  personnes: { total: number; actifs: number };
  equipes: { total: number };
  structures: { departments: number; entities: number };
  projets: { total: number; enCours: number; critiques: number };
  processus: { total: number; actifs: number };
  ressources: { total: number };
  objectifs: { total: number; enRetard: number };
  risques: { total: number; critiques: number };
  relations: { stakeholders: number; dependencies: number };
  decisions: { enAttente: number };
  liensInterDomaines: { sourceType: string; sourceId: string; targetType: string; targetId: string; type: string }[];
};

export async function buildDigitalTwinSnapshot(): Promise<DigitalTwinSnapshot> {
  const now = new Date();

  const [
    personnesTotal,
    personnesActifs,
    equipesTotal,
    departmentsTotal,
    entitiesTotal,
    projetsTotal,
    projetsEnCours,
    projetsCritiques,
    processusTotal,
    processusActifs,
    ressourcesTotal,
    objectifsTotal,
    objectifsEnRetard,
    projectRisksCritiques,
    orgRisksCritiques,
    projectRisksTotal,
    orgRisksTotal,
    stakeholdersTotal,
    dependenciesTotal,
    meetingDecisionsEnAttente,
    governanceDecisionsEnAttente,
    liensInterDomaines,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.team.count(),
    prisma.department.count(),
    prisma.entity.count(),
    prisma.project.count(),
    prisma.project.count({ where: { statut: "EN_COURS" } }),
    prisma.project.count({ where: { priorite: "CRITIQUE", statut: { in: ["PLANIFIE", "EN_COURS"] } } }),
    prisma.processus.count(),
    prisma.processus.count({ where: { statut: "ACTIF" } }),
    prisma.projectResource.count(),
    prisma.objective.count(),
    prisma.objective.count({ where: { statut: "EN_COURS", dateFin: { lt: now } } }),
    prisma.projectRisk.count({ where: { impact: "ELEVE", probabilite: "ELEVEE", statut: { notIn: ["MAITRISE", "CLOS"] } } }),
    prisma.organizationalRisk.count({ where: { criticite: { in: ["ELEVE", "CRITIQUE"] }, statut: { notIn: ["MAITRISE", "CLOS"] } } }),
    prisma.projectRisk.count(),
    prisma.organizationalRisk.count(),
    prisma.stakeholder.count(),
    prisma.dependency.count(),
    prisma.meetingDecision.count({ where: { statut: "EN_COURS" } }),
    prisma.governanceDecision.count({ where: { statut: "EN_COURS" } }),
    prisma.dependency.findMany({ take: 12, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    personnes: { total: personnesTotal, actifs: personnesActifs },
    equipes: { total: equipesTotal },
    structures: { departments: departmentsTotal, entities: entitiesTotal },
    projets: { total: projetsTotal, enCours: projetsEnCours, critiques: projetsCritiques },
    processus: { total: processusTotal, actifs: processusActifs },
    ressources: { total: ressourcesTotal },
    objectifs: { total: objectifsTotal, enRetard: objectifsEnRetard },
    risques: { total: projectRisksTotal + orgRisksTotal, critiques: projectRisksCritiques + orgRisksCritiques },
    relations: { stakeholders: stakeholdersTotal, dependencies: dependenciesTotal },
    decisions: { enAttente: meetingDecisionsEnAttente + governanceDecisionsEnAttente },
    liensInterDomaines: liensInterDomaines.map((d) => ({
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      targetType: d.targetType,
      targetId: d.targetId,
      type: d.type,
    })),
  };
}
