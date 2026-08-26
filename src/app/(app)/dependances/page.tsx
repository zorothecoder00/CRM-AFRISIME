import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { checkDependencyRisk, resolveDependencyLabels } from "@/lib/dependencies";
import { DependencyFormDialog } from "@/components/dependencies/dependency-form-dialog";
import { DependencyList, type DependencyRow } from "@/components/dependencies/dependency-list";

/**
 * V2.2 §13 — Cartographie des dépendances. Vue plate de toutes les
 * dépendances enregistrées (modèle générique Dependency) ; la détection de
 * risque automatique (⚠️) n'est implémentée que pour Projet→Projet, le seul
 * cas détaillé par le cahier des charges — voir src/lib/dependencies.ts.
 */
export default async function DependenciesPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);

  const [dependencies, projects, teams, users, processus, meetingDecisions, governanceDecisions, resources, partners, providers, transformations, milestones] =
    await Promise.all([
      prisma.dependency.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.team.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.processus.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.meetingDecision.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, description: true } }),
      prisma.governanceDecision.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, objet: true } }),
      prisma.projectResource.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.crmOrganization.findMany({ where: { type: "PARTENAIRE" }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.crmContact.findMany({ where: { type: "PRESTATAIRE" }, orderBy: { nom: "asc" }, select: { id: true, prenom: true, nom: true } }),
      prisma.transformation.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.projectMilestone.findMany({ orderBy: { dateCible: "asc" }, include: { project: { select: { nom: true } } } }),
    ]);

  const labels = await resolveDependencyLabels(
    dependencies.flatMap((d) => [
      { type: d.sourceType, id: d.sourceId },
      { type: d.targetType, id: d.targetId },
    ])
  );

  const dependencyRows: DependencyRow[] = await Promise.all(
    dependencies.map(async (d) => {
      const risk = await checkDependencyRisk(d);
      return {
        id: d.id,
        sourceLabel: labels.get(`${d.sourceType}:${d.sourceId}`) ?? `${d.sourceType} (introuvable)`,
        targetLabel: labels.get(`${d.targetType}:${d.targetId}`) ?? `${d.targetType} (introuvable)`,
        type: d.type,
        atRisk: risk.atRisk,
        riskMessage: risk.message,
      };
    })
  );

  const optionsByType = {
    Project: projects.map((p) => ({ id: p.id, label: p.nom })),
    Team: teams.map((t) => ({ id: t.id, label: t.nom })),
    User: users.map((u) => ({ id: u.id, label: u.name })),
    Processus: processus.map((p) => ({ id: p.id, label: p.nom })),
    MeetingDecision: meetingDecisions.map((d) => ({ id: d.id, label: d.description })),
    GovernanceDecision: governanceDecisions.map((d) => ({ id: d.id, label: d.objet })),
    ProjectResource: resources.map((r) => ({ id: r.id, label: r.nom })),
    CrmOrganization: partners.map((p) => ({ id: p.id, label: p.nom })),
    CrmContact: providers.map((p) => ({ id: p.id, label: `${p.prenom} ${p.nom}` })),
    Transformation: transformations.map((t) => ({ id: t.id, label: t.nom })),
    ProjectMilestone: milestones.map((m) => ({ id: m.id, label: `${m.project.nom} — ${m.nom}` })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dépendances</h1>
          <p className="text-sm text-muted-foreground">
            Cartographie des dépendances entre projets, équipes, personnes et processus.
          </p>
        </div>
        {canManage && <DependencyFormDialog optionsByType={optionsByType} />}
      </div>

      <DependencyList dependencies={dependencyRows} canManage={canManage} />
    </div>
  );
}
