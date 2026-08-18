import { prisma } from "@/lib/prisma";
import { getDependenciesFor } from "@/lib/dependencies";
import { collectDescendantIds, type DepartmentNode } from "@/lib/department-tree";

export type ChangeImpactAnalysis = {
  personnesAffectees: number;
  processusConcernes: { id: string; nom: string }[];
  competencesNecessaires: { id: string; nom: string }[];
  projetsConcernes: { id: string; nom: string }[];
  risques: { id: string; titre: string }[];
  coutOrganisationnel: number;
  communicationsNecessaires: string[];
};

// Change Impact Analysis (cahier des charges V3.0 §20) — "avant toute
// transformation" : qui est affecté, quels processus changent, quelles
// compétences sont nécessaires, quels projets sont concernés, quels risques
// apparaissent, quels coûts organisationnels, quelles communications
// nécessaires. Même principe de réutilisation que l'analyse d'impact §6
// (src/lib/impact-analysis.ts) : aucune donnée dupliquée/stockée, tout est
// calculé à partir des Dependency enregistrées sur la Transformation + du
// périmètre départemental.
export async function analyzeTransformationImpact(transformationId: string): Promise<ChangeImpactAnalysis> {
  const transformation = await prisma.transformation.findUniqueOrThrow({ where: { id: transformationId } });

  let scopeUserIds: string[] = [];
  let scopeProjectIds: string[] = [];
  if (transformation.departmentId) {
    const allDepartments = await prisma.department.findMany({ select: { id: true, name: true, parentId: true } });
    const scopeIds = collectDescendantIds(transformation.departmentId, allDepartments as DepartmentNode[]);
    const [users, projects] = await Promise.all([
      prisma.user.findMany({ where: { departmentId: { in: scopeIds }, isActive: true }, select: { id: true } }),
      prisma.project.findMany({ where: { departmentId: { in: scopeIds }, deletedAt: null }, select: { id: true } }),
    ]);
    scopeUserIds = users.map((u) => u.id);
    scopeProjectIds = projects.map((p) => p.id);
  }

  const dependencies = await getDependenciesFor("Transformation", transformationId);
  const linkedIds = (type: string) =>
    [...dependencies.upstream, ...dependencies.downstream]
      .filter((d) => (d.sourceType === "Transformation" ? d.targetType === type : d.sourceType === type))
      .map((d) => (d.sourceType === "Transformation" ? d.targetId : d.sourceId));

  const linkedProcessusIds = linkedIds("Processus");
  const linkedProjectIds = Array.from(new Set([...linkedIds("Project"), ...scopeProjectIds]));

  const [processus, competences, projets, projectRisks, orgRisks, stakeholders] = await Promise.all([
    prisma.processus.findMany({ where: { id: { in: linkedProcessusIds } }, select: { id: true, nom: true } }),
    scopeUserIds.length > 0
      ? prisma.userCompetence
          .groupBy({ by: ["competenceId"], where: { userId: { in: scopeUserIds } }, _count: { competenceId: true }, orderBy: { _count: { competenceId: "desc" } }, take: 5 })
          .then(async (groups) => {
            const comps = await prisma.competence.findMany({ where: { id: { in: groups.map((g) => g.competenceId) } }, select: { id: true, nom: true } });
            return comps;
          })
      : Promise.resolve([]),
    prisma.project.findMany({ where: { id: { in: linkedProjectIds } }, select: { id: true, nom: true, budget: true } }),
    prisma.projectRisk.findMany({ where: { projectId: { in: linkedProjectIds }, statut: { not: "CLOS" } }, select: { id: true, titre: true } }),
    transformation.departmentId
      ? prisma.organizationalRisk.findMany({ where: { statut: { not: "CLOS" }, project: { departmentId: transformation.departmentId } }, select: { id: true, titre: true } })
      : Promise.resolve([]),
    prisma.stakeholder.findMany({
      where: { projects: { some: { projectId: { in: linkedProjectIds } } } },
      select: { id: true, user: { select: { name: true } }, contact: { select: { prenom: true, nom: true } } },
    }),
  ]);

  const coutOrganisationnel = projets.reduce((s, p) => s + (p.budget ? Number(p.budget) : 0), 0);
  const communicationsNecessaires = stakeholders.map(
    (s) => s.user?.name ?? (s.contact ? `${s.contact.prenom} ${s.contact.nom}` : "Partie prenante")
  );

  return {
    personnesAffectees: scopeUserIds.length,
    processusConcernes: processus,
    competencesNecessaires: competences,
    projetsConcernes: projets.map((p) => ({ id: p.id, nom: p.nom })),
    risques: [...projectRisks, ...orgRisks],
    coutOrganisationnel,
    communicationsNecessaires,
  };
}
