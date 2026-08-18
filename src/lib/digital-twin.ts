import { prisma } from "@/lib/prisma";
import { entityLevelLabel, computeEntityDepth, type EntityNode } from "@/lib/entity-tree";
import { departmentLevelLabel, computeDepartmentDepth, type DepartmentNode } from "@/lib/department-tree";
import { computeWorkload } from "@/lib/workload";

// Jumeau numerique organisationnel (cahier des charges V2.2 §26, elargi en
// V3.0 §4 — "fonctionnalite emblematique de la V3"). Toujours un tableau de
// bord de synthese, pas un graphe visuel (voir §5 Organizational Graph /
// src/lib/organizational-graph.ts pour la representation navigable) —
// reorganise en 7 categories reprenant exactement la structure du cahier
// V3 §4.1 (Organisation/Capital humain/Activites/Ressources/Relations/
// Gouvernance/Performance) plutot que les 10 domaines plats de la V2.2.
// Aucun nouveau modele : chaque compteur reutilise une donnee deja en place.
export type DigitalTwinSnapshot = {
  organisation: {
    groupe: number;
    societes: number;
    filiales: number;
    agences: number;
    directions: number;
    departements: number;
    services: number;
    equipes: number;
  };
  capitalHumain: {
    collaborateurs: number;
    actifs: number;
    managers: number;
    competences: number;
    enSurcharge: number;
  };
  activites: {
    projets: number;
    programmes: number;
    taches: number;
    processus: number;
    workflows: number;
  };
  ressources: {
    // "Materiels"/"logiciels" (cahier §4.1) ne sont pas distingues en base
    // (ProjectResource.type est un champ texte libre) : compte agrege,
    // pas de faux detail par type.
    materiellesEtLogicielles: number;
    budgetTotal: number;
    ressourcesHumaines: number;
  };
  relations: {
    clients: number;
    partenaires: number;
    fournisseurs: number;
    institutions: number;
    investisseurs: number;
  };
  gouvernance: {
    instances: number;
    reunions: number;
    decisions: number;
    responsabilites: number;
  };
  performance: {
    kpi: number;
    objectifs: number;
    risques: number;
    incidents: number;
    audits: number;
  };
  liensInterDomaines: { sourceType: string; sourceId: string; targetType: string; targetId: string; type: string }[];
};

export async function buildDigitalTwinSnapshot(): Promise<DigitalTwinSnapshot> {
  const [
    entities,
    departments,
    equipesTotal,
    collaborateursTotal,
    collaborateursActifs,
    managersTotal,
    competencesTotal,
    workloadUsers,
    workloadTasks,
    workloadLeaves,
    projetsTotal,
    programmesTotal,
    tachesTotal,
    processusTotal,
    workflowsTotal,
    ressourcesTotal,
    budgetAgg,
    clientsContacts,
    partenairesTotal,
    fournisseursTotal,
    institutionsTotal,
    investisseursTotal,
    instancesTotal,
    reunionsTotal,
    governanceReunionsTotal,
    meetingDecisionsEnCours,
    governanceDecisionsEnCours,
    stakeholdersTotal,
    kpiTotal,
    objectifsTotal,
    projectRisksTotal,
    orgRisksTotal,
    incidentsTotal,
    auditsTotal,
    liensInterDomaines,
  ] = await Promise.all([
    prisma.entity.findMany({ select: { id: true, nom: true, parentId: true } }),
    prisma.department.findMany({ select: { id: true, name: true, parentId: true } }),
    prisma.team.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { directReports: { some: {} } } }),
    prisma.competence.count(),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capaciteHebdomadaireHeures: true, role: { select: { label: true } } },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: {
        statut: true,
        tempsEstimeHeures: true,
        tempsReelHeures: true,
        responsablePrincipalId: true,
        assignees: { select: { userId: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" }, select: { userId: true, dateDebut: true, dateFin: true, statut: true } }),
    prisma.project.count(),
    prisma.programme.count(),
    prisma.task.count({ where: { deletedAt: null } }),
    prisma.processus.count(),
    prisma.automationRule.count(),
    prisma.projectResource.count(),
    prisma.project.aggregate({ _sum: { budget: true } }),
    prisma.crmContact.count({ where: { type: "CLIENT" } }),
    prisma.crmOrganization.count({ where: { type: "PARTENAIRE" } }),
    prisma.crmOrganization.count({ where: { type: "FOURNISSEUR" } }),
    prisma.crmOrganization.count({ where: { type: "INSTITUTION" } }),
    prisma.crmOrganization.count({ where: { type: "INVESTISSEUR" } }),
    prisma.governanceInstance.count(),
    prisma.meeting.count(),
    prisma.governanceMeeting.count(),
    prisma.meetingDecision.count({ where: { statut: "EN_COURS" } }),
    prisma.governanceDecision.count({ where: { statut: "EN_COURS" } }),
    prisma.stakeholder.count(),
    prisma.indicator.count(),
    prisma.objective.count(),
    prisma.projectRisk.count(),
    prisma.organizationalRisk.count(),
    prisma.incident.count(),
    prisma.auditMission.count(),
    prisma.dependency.findMany({ take: 12, orderBy: { createdAt: "desc" } }),
  ]);

  const workload = computeWorkload(
    workloadUsers.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    workloadTasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    workloadLeaves
  );
  const enSurchargeTotal = workload.filter((w) => w.enSurcharge).length;

  const entityById = new Map<string, EntityNode>(entities.map((e) => [e.id, e]));
  const entityCounts = { groupe: 0, societes: 0, filiales: 0, agences: 0 };
  for (const e of entities) {
    const label = entityLevelLabel(computeEntityDepth(e.id, entityById));
    if (label === "Groupe") entityCounts.groupe++;
    else if (label === "Société") entityCounts.societes++;
    else if (label === "Filiale") entityCounts.filiales++;
    else entityCounts.agences++;
  }

  const departmentById = new Map<string, DepartmentNode>(
    departments.map((d) => [d.id, { id: d.id, name: d.name, parentId: d.parentId }])
  );
  const departmentCounts = { directions: 0, departements: 0, services: 0 };
  for (const d of departments) {
    const label = departmentLevelLabel(computeDepartmentDepth(d.id, departmentById));
    if (label === "Direction") departmentCounts.directions++;
    else if (label === "Département") departmentCounts.departements++;
    else departmentCounts.services++;
  }

  return {
    organisation: {
      groupe: entityCounts.groupe,
      societes: entityCounts.societes,
      filiales: entityCounts.filiales,
      agences: entityCounts.agences,
      directions: departmentCounts.directions,
      departements: departmentCounts.departements,
      services: departmentCounts.services,
      equipes: equipesTotal,
    },
    capitalHumain: {
      collaborateurs: collaborateursTotal,
      actifs: collaborateursActifs,
      managers: managersTotal,
      competences: competencesTotal,
      enSurcharge: enSurchargeTotal,
    },
    activites: {
      projets: projetsTotal,
      programmes: programmesTotal,
      taches: tachesTotal,
      processus: processusTotal,
      workflows: workflowsTotal,
    },
    ressources: {
      materiellesEtLogicielles: ressourcesTotal,
      budgetTotal: budgetAgg._sum.budget ? Number(budgetAgg._sum.budget) : 0,
      ressourcesHumaines: collaborateursActifs,
    },
    relations: {
      clients: clientsContacts,
      partenaires: partenairesTotal,
      fournisseurs: fournisseursTotal,
      institutions: institutionsTotal,
      investisseurs: investisseursTotal,
    },
    gouvernance: {
      instances: instancesTotal,
      reunions: reunionsTotal + governanceReunionsTotal,
      decisions: meetingDecisionsEnCours + governanceDecisionsEnCours,
      responsabilites: stakeholdersTotal,
    },
    performance: {
      kpi: kpiTotal,
      objectifs: objectifsTotal,
      risques: projectRisksTotal + orgRisksTotal,
      incidents: incidentsTotal,
      audits: auditsTotal,
    },
    liensInterDomaines: liensInterDomaines.map((d) => ({
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      targetType: d.targetType,
      targetId: d.targetId,
      type: d.type,
    })),
  };
}
