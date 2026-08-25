import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HierarchyTree, type SectionNode } from "@/components/projects/hierarchy-tree";
import { FolderTree, type FolderNode } from "@/components/documents/folder-tree";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { RuleFormDialog } from "@/components/automation/rule-form-dialog";
import { RuleList, type RuleData } from "@/components/automation/rule-list";
import { computeWorkload } from "@/lib/workload";
import { getOrganizationDevise } from "@/lib/currency";
import { WorkloadTable } from "@/components/workload/workload-table";
import { ProjectCoutReelForm } from "@/components/projects/project-cout-reel-form";
import { ProjectSponsorForm } from "@/components/projects/project-sponsor-form";
import { ProjectLocationForm } from "@/components/projects/project-location-form";
import { ProjectRisksSection, type RiskRow } from "@/components/projects/project-risks-section";
import { ProjectStakeholdersSection, type StakeholderRow } from "@/components/projects/project-stakeholders-section";
import { ProjectMilestonesSection, type MilestoneRow } from "@/components/projects/project-milestones-section";
import { ProjectDeliverablesSection, type DeliverableRow } from "@/components/projects/project-deliverables-section";
import { ProjectPilotagePanel } from "@/components/projects/project-pilotage-panel";
import { computeProjectPilotage } from "@/lib/project-pilotage";
import { computeProjectPrediction } from "@/lib/predictive-scoring";
import { getDependenciesFor, checkDependencyRisk, resolveDependencyLabels } from "@/lib/dependencies";
import { DependencyFormDialog } from "@/components/dependencies/dependency-form-dialog";
import { DependencyList, type DependencyRow } from "@/components/dependencies/dependency-list";
import { ensureProjectConversation } from "@/lib/project-conversation";
import { MessageThread, type MessageData } from "@/components/messages/message-thread";
import { documentUploaderName } from "@/lib/document-uploader";
import { ProjectDecisionsSection, type ProjectDecisionData } from "@/components/projects/project-decisions-section";
import { IndicatorList, type IndicatorData } from "@/components/objectives/indicator-list";
import { AddProjectIndicatorDialog } from "@/components/projects/add-project-indicator-dialog";
import { ProjectResourcesSection, type ProjectResourceData } from "@/components/projects/project-resources-section";
import { ProjectFinancementsSection, type FinancementRow } from "@/components/projects/project-financements-section";
import { TaskTimelineView } from "@/components/tasks/task-timeline-view";
import { TaskGanttView, type GanttTaskRow } from "@/components/tasks/task-gantt-view";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { getTagsFor } from "@/lib/tags";
import { EntityTagsEditor } from "@/components/tags/entity-tags-editor";
import { DeleteToTrashButton } from "@/components/trash/delete-to-trash-button";
import { TrashItemActions } from "@/components/trash/trash-item-actions";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);
  const canManageAutomation = session!.user.permissions.includes(PERMISSIONS.AUTOMATION_MANAGE);
  const canReadWorkload = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_READ);
  const canManageWorkload = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_MANAGE);
  const canUpdateProject = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);
  const canDeleteProject = session!.user.permissions.includes(PERMISSIONS.PROJECT_DELETE);
  const devise = await getOrganizationDevise();

  const [
    project,
    sections,
    tasks,
    users,
    folders,
    rootDocuments,
    rules,
    members,
    leaves,
    risks,
    stakeholders,
    milestones,
    deliverables,
    contacts,
    validationRuns,
    decisions,
    indicators,
    resources,
    availableStakeholdersRaw,
    tags,
    financements,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { department: true, responsable: true, programme: true, sponsor: true },
    }),
    prisma.projectSection.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { ordre: "asc" },
    }),
    prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: { responsablePrincipal: true, assignees: { select: { userId: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.documentFolder.findMany({
      where: { projectId },
      include: { _count: { select: { documents: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.document.findMany({
      where: { projectId, folderId: null, estArchive: false, deletedAt: null },
      include: {
        uploadedBy: true,
        uploadedByContact: true,
        task: true,
        meeting: true,
        _count: { select: { versions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.automationRule.findMany({
      where: { projectId, playbookId: null },
      include: {
        executions: { orderBy: { executedAt: "desc" }, take: 5 },
        conditions: { orderBy: { ordre: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { include: { role: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    prisma.projectRisk.findMany({
      where: { projectId },
      include: { responsable: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stakeholderProject.findMany({
      where: { projectId },
      include: { stakeholder: { include: { user: true, contact: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectMilestone.findMany({ where: { projectId }, orderBy: { dateCible: "asc" } }),
    prisma.projectDeliverable.findMany({
      where: { projectId },
      include: { responsable: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" }, select: { id: true, prenom: true, nom: true } }),
    prisma.taskValidationRun.findMany({
      where: { task: { projectId }, statut: { in: ["APPROUVE", "REJETE"] } },
      select: { statut: true },
    }),
    prisma.meetingDecision.findMany({
      where: { projectId },
      include: { responsable: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.indicator.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.projectResource.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.stakeholder.findMany({
      where: { projects: { none: { projectId } } },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
    getTagsFor("Project", projectId),
    prisma.financement.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!project) {
    notFound();
  }

  // Isolation multi-entites (cahier des charges V2.2 §22) — voir entity-scope.ts.
  const entityScope = await getUserEntityScope(session!.user.id, session!.user.permissions);
  const allowedDepartmentIds = await getAllowedDepartmentIds(entityScope);
  if (allowedDepartmentIds && !allowedDepartmentIds.includes(project.departmentId)) {
    notFound();
  }

  // Fil de discussion du projet (cahier des charges §10) : un seul canal
  // par projet, participants synchronises sur l'equipe courante a chaque
  // ouverture de l'onglet.
  const conversationId = await ensureProjectConversation(project.id, session!.user.id);
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      messages: {
        include: { author: true, reactions: { include: { user: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const conversationMessages: MessageData[] = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    authorId: m.authorId,
    authorName: m.author.name,
    authorImage: m.author.image,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId, userName: r.user.name })),
    attachmentUrl: m.attachmentUrl,
    attachmentNom: m.attachmentNom,
    isDeleted: !!m.deletedAt,
  }));

  // Charge de travail restreinte a l'equipe du projet et a ses taches
  // (cahier des charges §VI — vue "Workload" par projet, distincte de la
  // charge globale de /charge-de-travail).
  const projectWorkload = computeWorkload(
    members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      roleLabel: m.user.role.label,
      capaciteHebdomadaireHeures: Number(m.user.capaciteHebdomadaireHeures),
    })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves.map((l) => ({
      userId: l.userId,
      dateDebut: l.dateDebut,
      dateFin: l.dateFin,
      statut: l.statut,
    }))
  );

  const pilotage = computeProjectPilotage({
    project: {
      avancement: project.avancement,
      budget: project.budget ? Number(project.budget) : null,
      coutReel: project.coutReel ? Number(project.coutReel) : null,
      statut: project.statut,
      dateFin: project.dateFin,
    },
    tasks: tasks.map((t) => ({ statut: t.statut, echeance: t.echeance, completedAt: t.completedAt })),
    workload: projectWorkload.map((w) => ({ tauxOccupation: w.tauxOccupation })),
    risks: risks.map((r) => ({ statut: r.statut, probabilite: r.probabilite, impact: r.impact })),
    deliverables: deliverables.map((d) => ({ statut: d.statut })),
    validationRuns,
  });

  const prediction = project.statut === "EN_COURS" ? await computeProjectPrediction(project.id) : null;

  const { upstream: projectDependsOn } = await getDependenciesFor("Project", project.id);
  const dependencyLabels = await resolveDependencyLabels(
    projectDependsOn.map((d) => ({ type: d.targetType, id: d.targetId }))
  );
  const dependencyRows: DependencyRow[] = await Promise.all(
    projectDependsOn.map(async (d) => {
      const risk = await checkDependencyRisk(d);
      return {
        id: d.id,
        sourceLabel: project.nom,
        targetLabel: dependencyLabels.get(`${d.targetType}:${d.targetId}`) ?? `${d.targetType} (introuvable)`,
        type: d.type,
        atRisk: risk.atRisk,
        riskMessage: risk.message,
      };
    })
  );
  const otherProjects = await prisma.project.findMany({
    where: { id: { not: project.id } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });
  const dependencyOptionsByType = {
    Project: otherProjects.map((p) => ({ id: p.id, label: p.nom })),
    Team: [],
    User: [],
    Processus: [],
    MeetingDecision: [],
    GovernanceDecision: [],
    ProjectResource: [],
    CrmOrganization: [],
    CrmContact: [],
    Transformation: [],
  };

  const responsableById = new Map(users.map((u) => [u.id, u.name]));

  const nodeById = new Map<string, SectionNode>();
  for (const section of sections) {
    nodeById.set(section.id, {
      id: section.id,
      nom: section.nom,
      type: section.type,
      statut: section.statut,
      responsableName: section.responsableId ? responsableById.get(section.responsableId) ?? null : null,
      taskCount: section._count.tasks,
      children: [],
    });
  }
  const roots: SectionNode[] = [];
  for (const section of sections) {
    const node = nodeById.get(section.id)!;
    if (section.parentId && nodeById.has(section.parentId)) {
      nodeById.get(section.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));
  const contactOptions = contacts.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }));

  const riskRows: RiskRow[] = risks.map((r) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    probabilite: r.probabilite,
    impact: r.impact,
    statut: r.statut,
    planMitigation: r.planMitigation,
    responsableName: r.responsable?.name ?? null,
  }));

  const stakeholderRows: StakeholderRow[] = stakeholders.map((link) => ({
    linkId: link.id,
    stakeholderId: link.stakeholder.id,
    nom: link.stakeholder.nom,
    role: link.role,
    influence: link.stakeholder.influence,
    interet: link.stakeholder.interet,
    niveauEngagement: link.stakeholder.niveauEngagement,
    userName: link.stakeholder.user?.name ?? null,
    contactName: link.stakeholder.contact ? `${link.stakeholder.contact.prenom} ${link.stakeholder.contact.nom}` : null,
  }));
  const availableStakeholders = availableStakeholdersRaw.map((s) => ({ id: s.id, label: s.nom }));

  const decisionRows: ProjectDecisionData[] = decisions.map((d) => ({
    id: d.id,
    description: d.description,
    motif: d.motif,
    statut: d.statut,
    responsableName: d.responsable?.name ?? null,
    echeance: d.echeance ? d.echeance.toISOString() : null,
    taskId: d.taskId,
  }));

  const indicatorRows: IndicatorData[] = indicators.map((i) => ({
    id: i.id,
    nom: i.nom,
    unite: i.unite,
    valeurCible: Number(i.valeurCible),
    valeurActuelle: Number(i.valeurActuelle),
  }));

  const ganttRows: GanttTaskRow[] = tasks.map((t) => ({
    id: t.id,
    titre: t.titre,
    projectNom: project.nom,
    statut: t.statut,
    priorite: t.priorite,
    echeance: t.echeance ? t.echeance.toISOString() : null,
    dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
    responsableNom: t.responsablePrincipal.name,
    avancement: t.avancement,
  }));

  const financementRows: FinancementRow[] = financements.map((f) => ({
    id: f.id,
    bailleur: f.bailleur,
    montant: Number(f.montant),
    statut: f.statut,
    dateObtention: f.dateObtention ? f.dateObtention.toISOString() : null,
    dateEcheance: f.dateEcheance ? f.dateEcheance.toISOString() : null,
    notes: f.notes,
  }));

  const resourceRows: ProjectResourceData[] = resources.map((r) => ({
    id: r.id,
    nom: r.nom,
    type: r.type,
    quantite: r.quantite !== null ? Number(r.quantite) : null,
    unite: r.unite,
    coutUnitaire: r.coutUnitaire !== null ? Number(r.coutUnitaire) : null,
  }));

  const milestoneRows: MilestoneRow[] = milestones.map((m) => ({
    id: m.id,
    nom: m.nom,
    description: m.description,
    dateCible: m.dateCible.toISOString(),
    statut: m.statut,
  }));

  const deliverableRows: DeliverableRow[] = deliverables.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    statut: d.statut,
    echeance: d.echeance ? d.echeance.toISOString() : null,
    responsableName: d.responsable?.name ?? null,
  }));

  const folderNodeById = new Map<string, FolderNode>();
  for (const f of folders) {
    folderNodeById.set(f.id, { id: f.id, nom: f.nom, documentCount: f._count.documents, children: [] });
  }
  const folderRoots: FolderNode[] = [];
  for (const f of folders) {
    const node = folderNodeById.get(f.id)!;
    if (f.parentId && folderNodeById.has(f.parentId)) {
      folderNodeById.get(f.parentId)!.children.push(node);
    } else {
      folderRoots.push(node);
    }
  }
  const folderOptions = folders.map((f) => ({ id: f.id, label: f.nom }));

  const documentRows: DocumentRow[] = rootDocuments.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    uploadedByName: documentUploaderName(d),
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: d.task?.titre ?? null,
    taskId: d.taskId,
    meetingTitre: d.meeting?.titre ?? null,
    meetingId: d.meetingId,
    type: d.type,
    statutSignature: d.statutSignature,
    estArchive: d.estArchive,
  }));

  const ruleData: RuleData[] = rules.map((r) => ({
    id: r.id,
    nom: r.nom,
    trigger: r.trigger,
    action: r.action,
    niveauIA: r.niveauIA,
    isActive: r.isActive,
    projectId: r.projectId,
    nextTaskTitre: r.nextTaskTitre,
    conditions: r.conditions.map((c) => ({
      champ: c.champ,
      operateur: c.operateur,
      valeur: c.valeur,
      connecteur: c.connecteur,
    })),
    executions: r.executions.map((e) => ({
      id: e.id,
      resultat: e.resultat,
      executedAt: e.executedAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      {project.deletedAt && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">Ce projet a été supprimé et se trouve dans la corbeille.</p>
          {canDeleteProject && <TrashItemActions entityType="Project" id={project.id} canPurge={false} />}
        </div>
      )}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{project.nom}</h1>
          <Badge variant={toneForStatus(project.statut)}>{STATUS_LABELS[project.statut]}</Badge>
          {canDeleteProject && !project.deletedAt && <DeleteToTrashButton entityType="Project" id={project.id} />}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.description || "Pas de description."}
        </p>
        <div className="mt-2">
          <EntityTagsEditor entityType="Project" entityId={project.id} initialTags={tags} canManage={canUpdateProject} />
        </div>
      </div>

      <Tabs defaultValue="apercu">
        <TabsList>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="pilotage">Pilotage</TabsTrigger>
          <TabsTrigger value="hierarchie">Hiérarchie</TabsTrigger>
          <TabsTrigger value="taches">Tâches</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="jalons">Jalons</TabsTrigger>
          <TabsTrigger value="livrables">Livrables</TabsTrigger>
          <TabsTrigger value="risques">Risques</TabsTrigger>
          <TabsTrigger value="parties-prenantes">Parties prenantes</TabsTrigger>
          <TabsTrigger value="decisions">Décisions</TabsTrigger>
          <TabsTrigger value="kpi">KPI</TabsTrigger>
          <TabsTrigger value="ressources">Ressources</TabsTrigger>
          <TabsTrigger value="financement">Financement</TabsTrigger>
          {canReadWorkload && <TabsTrigger value="charge">Charge de travail</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="automatisations">Automatisations</TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="mt-4">
          <Card accent={accentForStatus(project.statut)}>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <Info label="Objectif" value={project.objectif || "—"} />
              <Info label="Programme" value={project.programme?.nom || "—"} />
              <Info label="Responsable" value={project.responsable.name} />
              <Info label="Département" value={project.department.name} />
              <Info label="Priorité" value={project.priorite} />
              <Info
                label="Date de début"
                value={project.dateDebut ? new Date(project.dateDebut).toLocaleDateString("fr-FR") : "—"}
              />
              <Info
                label="Date de fin"
                value={project.dateFin ? new Date(project.dateFin).toLocaleDateString("fr-FR") : "—"}
              />
              <Info label="Budget" value={project.budget ? `${project.budget} ${devise}` : "—"} />
              <Info label="Avancement" value={`${project.avancement}%`} />
            </CardContent>
            <CardContent className="pt-0">
              <div className="mb-1 text-xs text-muted-foreground">Sponsor</div>
              {canUpdateProject ? (
                <ProjectSponsorForm projectId={project.id} users={userOptions} initialSponsorId={project.sponsorId} />
              ) : (
                <p className="text-sm font-medium">{project.sponsor?.name || "—"}</p>
              )}
            </CardContent>
            <CardContent className="pt-0">
              <div className="mb-1 text-xs text-muted-foreground">Localisation</div>
              {canUpdateProject ? (
                <ProjectLocationForm
                  projectId={project.id}
                  initialLocalisation={project.localisation}
                  initialPays={project.pays}
                  initialLatitude={project.latitude}
                  initialLongitude={project.longitude}
                />
              ) : (
                <p className="text-sm font-medium">
                  {[project.localisation, project.pays].filter(Boolean).join(", ") || "—"}
                </p>
              )}
            </CardContent>
            <CardContent className="pt-0">
              <div className="mb-1 text-xs text-muted-foreground">Coût réel</div>
              {canUpdateProject ? (
                <ProjectCoutReelForm
                  projectId={project.id}
                  budget={project.budget ? Number(project.budget) : null}
                  initialValue={project.coutReel ? Number(project.coutReel) : null}
                  devise={devise}
                />
              ) : (
                <p className="text-sm font-medium">
                  {project.coutReel ? `${project.coutReel} ${devise}` : "—"}
                  {project.budget && project.coutReel && Number(project.coutReel) > Number(project.budget) && (
                    <Badge variant="destructive" className="ml-2">
                      Budget dépassé
                    </Badge>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pilotage" className="mt-4 space-y-3">
          <Link
            href={`/pilotage/departement/${project.departmentId}`}
            className="inline-block text-sm text-primary hover:underline"
          >
            Voir le pilotage du département {project.department.name} →
          </Link>
          <ProjectPilotagePanel pilotage={pilotage} devise={devise} />
          {prediction && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Intelligence prédictive</h3>
                <Link href="/predictions" className="text-xs text-primary hover:underline">
                  Voir toutes les prédictions →
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant={prediction.risqueEchec >= 60 ? "destructive" : prediction.risqueEchec >= 30 ? "secondary" : "outline"}>
                  Risque d&apos;échec : {prediction.risqueEchec}%
                </Badge>
                <Badge variant="outline">Retard : {prediction.probabiliteRetard}%</Badge>
                <Badge variant="outline">Dépassement : {prediction.probabiliteDepassement}%</Badge>
              </div>
              {prediction.facteurs.length > 0 && (
                <ul className="text-xs text-muted-foreground">
                  {prediction.facteurs.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">Estimation heuristique, pas un modèle prédictif entraîné.</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Dépendances</h3>
              {canUpdateProject && (
                <DependencyFormDialog
                  optionsByType={dependencyOptionsByType}
                  defaultSourceType="Project"
                  defaultSourceId={project.id}
                />
              )}
            </div>
            <DependencyList dependencies={dependencyRows} canManage={canUpdateProject} />
          </div>
        </TabsContent>

        <TabsContent value="hierarchie" className="mt-4">
          <HierarchyTree nodes={roots} projectId={project.id} users={userOptions} />
        </TabsContent>

        <TabsContent value="taches" className="mt-4">
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune tâche pour ce projet.</p>
            )}
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/taches/${task.id}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
              >
                <span className="font-medium">{task.titre}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {task.responsablePrincipal.name}
                  </span>
                  <Badge variant={toneForStatus(task.statut)}>{TASK_STATUS_LABELS[task.statut]}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TaskTimelineView tasks={ganttRows} />
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <TaskGanttView tasks={ganttRows} />
        </TabsContent>

        <TabsContent value="jalons" className="mt-4">
          <ProjectMilestonesSection projectId={project.id} milestones={milestoneRows} canManage={canUpdateProject} />
        </TabsContent>

        <TabsContent value="livrables" className="mt-4">
          <ProjectDeliverablesSection
            projectId={project.id}
            deliverables={deliverableRows}
            users={userOptions}
            canManage={canUpdateProject}
          />
        </TabsContent>

        <TabsContent value="risques" className="mt-4">
          <ProjectRisksSection projectId={project.id} risks={riskRows} users={userOptions} canManage={canUpdateProject} />
        </TabsContent>

        <TabsContent value="parties-prenantes" className="mt-4">
          <ProjectStakeholdersSection
            projectId={project.id}
            stakeholders={stakeholderRows}
            users={userOptions}
            contacts={contactOptions}
            availableStakeholders={availableStakeholders}
            canManage={canUpdateProject}
          />
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <ProjectDecisionsSection projectId={project.id} decisions={decisionRows} users={userOptions} />
        </TabsContent>

        <TabsContent value="kpi" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Indicateurs clés de performance du projet.</p>
            <AddProjectIndicatorDialog projectId={project.id} />
          </div>
          <IndicatorList indicators={indicatorRows} />
        </TabsContent>

        <TabsContent value="ressources" className="mt-4">
          <ProjectResourcesSection projectId={project.id} resources={resourceRows} devise={devise} />
        </TabsContent>

        <TabsContent value="financement" className="mt-4">
          <ProjectFinancementsSection
            projectId={project.id}
            financements={financementRows}
            devise={devise}
            canManage={canUpdateProject}
          />
        </TabsContent>

        {canReadWorkload && (
          <TabsContent value="charge" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Charge de l&apos;équipe du projet, calculée à partir des tâches actives de ce projet uniquement.
            </p>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre rattaché à ce projet.</p>
            ) : (
              <WorkloadTable rows={projectWorkload} canManage={canManageWorkload} />
            )}
          </TabsContent>
        )}

        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Aperçu de la racine de l&apos;espace documentaire.
            </p>
            <div className="flex gap-2">
              <FolderFormDialog projectId={project.id} triggerLabel="Nouveau dossier" />
              <DocumentFormDialog projectId={project.id} folders={folderOptions} />
              <Link href={`/documents?projetId=${project.id}`}>
                <Button variant="outline" size="sm">
                  Ouvrir l&apos;espace complet
                </Button>
              </Link>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dossiers</CardTitle>
            </CardHeader>
            <CardContent>
              <FolderTree
                nodes={folderRoots}
                projectId={project.id}
                buildHref={(id) => `/documents?projetId=${project.id}${id ? `&folderId=${id}` : ""}`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents (racine)</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentList documents={documentRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussion" className="mt-4">
          <p className="mb-2 text-sm text-muted-foreground">
            Fil de discussion de l&apos;équipe projet. Les membres actuels du projet y ont automatiquement accès.
          </p>
          <div className="flex h-[600px] flex-col overflow-hidden rounded-lg border">
            <MessageThread
              conversationId={conversation.id}
              messages={conversationMessages}
              currentUserId={session!.user.id}
              mentionCandidates={members
                .filter((m) => m.userId !== session!.user.id)
                .map((m) => ({ id: m.userId, name: m.user.name }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="automatisations" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Règles « si... alors... » déclenchées automatiquement pour ce projet.
            </p>
            {canManageAutomation && (
              <RuleFormDialog
                projectId={project.id}
                users={userOptions}
                existingRules={rules.map((r) => ({ id: r.id, label: r.nom }))}
              />
            )}
          </div>
          <RuleList rules={ruleData} canManage={canManageAutomation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
