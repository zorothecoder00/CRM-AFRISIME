import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { type SectionNode } from "@/components/projects/hierarchy-tree";
import { type FolderNode } from "@/components/documents/folder-tree";
import { type DocumentRow } from "@/components/documents/document-list";
import { type RuleData } from "@/components/automation/rule-list";
import { computeWorkload } from "@/lib/workload";
import { getOrganizationDevise } from "@/lib/currency";
import { type RiskRow } from "@/components/projects/project-risks-section";
import { type StakeholderRow } from "@/components/projects/project-stakeholders-section";
import { type MilestoneRow } from "@/components/projects/project-milestones-section";
import { type DeliverableRow } from "@/components/projects/project-deliverables-section";
import { computeProjectPilotage } from "@/lib/project-pilotage";
import { computeEvm } from "@/lib/evm";
import { computeProjectPrediction } from "@/lib/predictive-scoring";
import { getDependenciesFor, checkDependencyRisk, resolveDependencyLabels } from "@/lib/dependencies";
import { type DependencyRow } from "@/components/dependencies/dependency-list";
import { ensureProjectConversation } from "@/lib/project-conversation";
import { type MessageData } from "@/components/messages/message-thread";
import { documentUploaderName } from "@/lib/document-uploader";
import { type ProjectDecisionData } from "@/components/projects/project-decisions-section";
import { type IndicatorData } from "@/components/objectives/indicator-list";
import { type ProjectResourceData } from "@/components/projects/project-resources-section";
import { type FinancementRow } from "@/components/projects/project-financements-section";
import { type BeneficiaireRow } from "@/components/programmes/beneficiaires-section";
import { type FeedbackRow } from "@/components/projects/project-feedback-section";
import { computeFeedbackSummary } from "@/lib/beneficiary-feedback";
import { type MEEvaluationRow } from "@/components/projects/project-me-section";
import { type DataFormRow } from "@/components/projects/project-data-forms-section";
import { computeHealthScore, computeAchievementSummary, computePostMortem } from "@/lib/project-bilan";
import { computeClosureChecklist } from "@/lib/project-closure";
import { type LessonLearnedRow } from "@/components/projects/project-lessons-learned-section";
import { type ProjectMemberRow, type ProjectPartnerRow } from "@/components/projects/project-team-section";
import { type ProjectMeetingRow } from "@/components/projects/project-meetings-section";
import { type ProjectDiagnosticData } from "@/components/projects/project-diagnostic-form";
import { type ProblemTreeNodeData } from "@/components/projects/problem-tree-view";
import { type SolutionTreeNodeData } from "@/components/projects/solution-tree-view";
import { buildTree } from "@/lib/tree";
import { type TheoryOfChangeNodeData } from "@/components/projects/theory-of-change-view";
import { type LogframeRowData } from "@/components/projects/logframe-view";
import { computeResultFramework } from "@/lib/result-framework";
import { type ObjectiveNodeData } from "@/components/projects/project-objectives-builder";
import { checkObjectivesConsistency } from "@/lib/objectives-consistency";
import { computeCriticalPath } from "@/lib/critical-path";
import { type GanttTaskRow, type GanttDependency } from "@/components/tasks/task-gantt-view";
import type { MindMapTaskRow } from "@/components/tasks/task-mindmap-view";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { getTagsFor } from "@/lib/tags";
import { type RaciSectionData, type RaciConsistencyIssueData } from "@/components/projects/raci-matrix-view";
import { checkRaciConsistency } from "@/lib/raci-consistency";
import { type AssumptionRow } from "@/components/projects/assumption-register-view";
import { type BudgetLineRow, type BudgetRollupRow } from "@/components/projects/project-budget-section";
import { computeBudgetRollup } from "@/lib/budget-rollup";
import { type FundingOpportunityRow } from "@/components/projects/project-funding-opportunities-section";
import type { IncidentCardData } from "@/components/incidents/incident-card";
import { type ChangeRequestRow } from "@/components/projects/project-change-requests-section";
import { type QualityPlanData, type QualityControlRow } from "@/components/projects/project-quality-section";
import { type ProcurementItemRow } from "@/components/projects/project-procurement-section";
import { type ContractRow } from "@/components/projects/project-contracts-section";
import { type CommunicationPlanEntryRow } from "@/components/projects/communication-plan-section";


export async function loadProjectPageData(projectId: string) {
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
    beneficiaires,
    feedbacks,
    meEvaluations,
    dataForms,
    projectMeetings,
    closureChecklist,
    lessonsLearned,
    diagnostic,
    problemTree,
    allProjectDocuments,
    solutionTree,
    theoryOfChangeNodes,
    logframeRows,
    objectives,
    taskDependencies,
    raciAssignments,
    assumptions,
    budgetLines,
    fundingOpportunities,
    issues,
    changeRequests,
    qualityPlanDoc,
    qualityControls,
    procurementItems,
    projectContracts,
    fournisseurs,
    communicationPlanEntries,
    projectPartners,
    partnerOrganizations,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { department: true, responsable: true, programme: true, sponsor: true } }),
    prisma.projectSection.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true } } },
      orderBy: { ordre: "asc" } }),
    prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: { responsablePrincipal: true, assignees: { select: { userId: true } } },
      orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.documentFolder.findMany({
      where: { projectId },
      include: { _count: { select: { documents: true } } },
      orderBy: { nom: "asc" } }),
    prisma.document.findMany({
      where: { projectId, folderId: null, estArchive: false, deletedAt: null },
      include: {
        uploadedBy: true,
        uploadedByContact: true,
        task: true,
        meeting: true,
        _count: { select: { versions: true } } },
      orderBy: { createdAt: "desc" } }),
    prisma.automationRule.findMany({
      where: { projectId, playbookId: null },
      include: {
        executions: { orderBy: { executedAt: "desc" }, take: 5 },
        conditions: { orderBy: { ordre: "asc" } } },
      orderBy: { createdAt: "desc" } }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { include: { role: true } } } }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    prisma.projectRisk.findMany({
      where: { projectId },
      include: { responsable: true },
      orderBy: { createdAt: "desc" } }),
    prisma.stakeholderProject.findMany({
      where: { projectId },
      include: { stakeholder: { include: { user: true, contact: true } } },
      orderBy: { createdAt: "asc" } }),
    prisma.projectMilestone.findMany({
      where: { projectId },
      include: { valideur: true },
      orderBy: { dateCible: "asc" } }),
    prisma.projectDeliverable.findMany({
      where: { projectId },
      include: { responsable: true, valideur: true },
      orderBy: { createdAt: "desc" } }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" }, select: { id: true, prenom: true, nom: true } }),
    prisma.taskValidationRun.findMany({
      where: { task: { projectId }, statut: { in: ["APPROUVE", "REJETE"] } },
      select: { statut: true } }),
    prisma.meetingDecision.findMany({
      where: { projectId },
      include: { responsable: true },
      orderBy: { createdAt: "desc" } }),
    prisma.indicator.findMany({
      where: { projectId },
      include: { responsable: true },
      orderBy: { createdAt: "asc" } }),
    prisma.projectResource.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.stakeholder.findMany({
      where: { projects: { none: { projectId } } },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true } }),
    getTagsFor("Project", projectId),
    prisma.financement.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.beneficiaire.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.projectFeedback.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.projectMEEvaluation.findMany({
      where: { projectId },
      include: { criteres: true },
      orderBy: { dateEvaluation: "desc" } }),
    prisma.projectDataForm.findMany({
      where: { projectId },
      include: {
        fields: { include: { indicator: { select: { nom: true } } }, orderBy: { ordre: "asc" } },
        submissions: { include: { submittedBy: true }, orderBy: { submittedAt: "desc" } } },
      orderBy: { createdAt: "desc" } }),
    prisma.meeting.findMany({ where: { projectId }, orderBy: { dateHeure: "desc" } }),
    prisma.projectClosureChecklist.findUnique({ where: { projectId } }),
    prisma.projectLessonLearned.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.projectDiagnostic.findUnique({ where: { projectId } }),
    prisma.problemTreeNode.findMany({
      where: { projectId },
      include: {
        linkedDocuments: { include: { document: { select: { nom: true } } } },
        linkedIndicators: { include: { indicator: { select: { nom: true } } } },
        comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } } },
      orderBy: { ordre: "asc" } }),
    prisma.document.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" } }),
    prisma.solutionTreeNode.findMany({ where: { projectId }, orderBy: { ordre: "asc" } }),
    prisma.theoryOfChangeNode.findMany({
      where: { projectId },
      include: { sections: { select: { id: true } }, _count: { select: { indicators: true } } },
      orderBy: { ordre: "asc" } }),
    prisma.logframeRow.findMany({ where: { projectId } }),
    prisma.objective.findMany({
      where: { projectId, niveau: { not: null } },
      include: { children: true, deliverables: true },
      orderBy: { createdAt: "asc" } }),
    prisma.taskDependency.findMany({ where: { task: { projectId } }, select: { taskId: true, dependsOnTaskId: true, type: true } }),
    prisma.raciAssignment.findMany({ where: { section: { projectId } }, include: { user: true } }),
    prisma.projectAssumption.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.budgetLine.findMany({ where: { projectId }, include: { section: true }, orderBy: { createdAt: "asc" } }),
    prisma.fundingOpportunity.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.incident.findMany({ where: { projectId }, include: { declarePar: true }, orderBy: { dateDeclaration: "desc" } }),
    prisma.projectChangeRequest.findMany({ where: { projectId }, include: { demandePar: true }, orderBy: { createdAt: "desc" } }),
    prisma.qualityDocument.findFirst({ where: { projectId, type: "PLAN_QUALITE" } }),
    prisma.qualityControl.findMany({
      where: { projectId },
      include: {
        deliverable: true,
        responsable: true,
        controlePar: true,
        checklist: { orderBy: { ordre: "asc" } } },
      orderBy: { dateControle: "desc" } }),
    prisma.procurementItem.findMany({ where: { projectId }, include: { fournisseur: true }, orderBy: { createdAt: "desc" } }),
    prisma.projectContract.findMany({
      where: { projectId },
      include: { fournisseur: true, deliverables: true, payments: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" } }),
    prisma.crmOrganization.findMany({ where: { type: "FOURNISSEUR" }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.communicationPlanEntry.findMany({ where: { projectId }, include: { responsable: true }, orderBy: { createdAt: "asc" } }),
    prisma.projectPartner.findMany({
      where: { projectId },
      include: { crmOrganization: { select: { id: true, nom: true } } },
      orderBy: { addedAt: "asc" } }),
    prisma.crmOrganization.findMany({ where: { type: "PARTENAIRE" }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
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
        orderBy: { createdAt: "asc" } } } });
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
    isDeleted: !!m.deletedAt }));

  // Charge de travail restreinte a l'equipe du projet et a ses taches
  // (cahier des charges §VI — vue "Workload" par projet, distincte de la
  // charge globale de /charge-de-travail).
  const projectWorkload = computeWorkload(
    members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      roleLabel: m.user.role.label,
      capaciteHebdomadaireHeures: Number(m.user.capaciteHebdomadaireHeures) })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt })),
    leaves.map((l) => ({
      userId: l.userId,
      dateDebut: l.dateDebut,
      dateFin: l.dateFin,
      statut: l.statut }))
  );

  const pilotage = computeProjectPilotage({
    project: {
      avancement: project.avancement,
      budget: project.budget ? Number(project.budget) : null,
      coutReel: project.coutReel ? Number(project.coutReel) : null,
      statut: project.statut,
      dateFin: project.dateFin },
    tasks: tasks.map((t) => ({ statut: t.statut, echeance: t.echeance, completedAt: t.completedAt })),
    workload: projectWorkload.map((w) => ({ tauxOccupation: w.tauxOccupation })),
    risks: risks.map((r) => ({ statut: r.statut, probabilite: r.probabilite, impact: r.impact })),
    deliverables: deliverables.map((d) => ({ statut: d.statut })),
    validationRuns });

  const evm = computeEvm({
    budget: project.budget ? Number(project.budget) : null,
    coutReel: project.coutReel ? Number(project.coutReel) : null,
    avancement: project.avancement,
    dateDebut: project.dateDebut,
    dateFin: project.dateFin });

  const prediction = project.statut === "EN_COURS" ? await computeProjectPrediction(project.id) : null;

  const objectivesConsistencyIssues = await checkObjectivesConsistency(project.id);

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
        riskMessage: risk.message };
    })
  );
  const otherProjects = await prisma.project.findMany({
    where: { id: { not: project.id } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true } });
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
    // Project Studio §44 — un jalon peut dependre d'un autre jalon du meme projet.
    ProjectMilestone: milestones.map((m) => ({ id: m.id, label: m.nom })) };

  // Project Studio §44 — dependances des jalons (source = ProjectMilestone),
  // recuperees en une seule requete groupee plutot qu'une par jalon.
  const milestoneIds = milestones.map((m) => m.id);
  const milestoneDependencies =
    milestoneIds.length > 0
      ? await prisma.dependency.findMany({ where: { sourceType: "ProjectMilestone", sourceId: { in: milestoneIds } } })
      : [];
  const milestoneDependencyLabels = await resolveDependencyLabels(
    milestoneDependencies.map((d) => ({ type: d.targetType, id: d.targetId }))
  );
  const milestoneDependencyRowsById = new Map<string, DependencyRow[]>();
  for (const d of milestoneDependencies) {
    const row: DependencyRow = {
      id: d.id,
      sourceLabel: milestones.find((m) => m.id === d.sourceId)?.nom ?? "Jalon",
      targetLabel: milestoneDependencyLabels.get(`${d.targetType}:${d.targetId}`) ?? `${d.targetType} (introuvable)`,
      type: d.type,
      atRisk: false,
      riskMessage: null };
    const list = milestoneDependencyRowsById.get(d.sourceId) ?? [];
    list.push(row);
    milestoneDependencyRowsById.set(d.sourceId, list);
  }

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
      children: [] });
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
    categorie: r.categorie,
    planMitigation: r.planMitigation,
    planContingence: r.planContingence,
    responsableName: r.responsable?.name ?? null }));

  const stakeholderRows: StakeholderRow[] = stakeholders.map((link) => ({
    linkId: link.id,
    stakeholderId: link.stakeholder.id,
    nom: link.stakeholder.nom,
    role: link.role,
    influence: link.stakeholder.influence,
    interet: link.stakeholder.interet,
    niveauEngagement: link.stakeholder.niveauEngagement,
    userName: link.stakeholder.user?.name ?? null,
    contactName: link.stakeholder.contact ? `${link.stakeholder.contact.prenom} ${link.stakeholder.contact.nom}` : null }));
  const availableStakeholders = availableStakeholdersRaw.map((s) => ({ id: s.id, label: s.nom }));

  const decisionRows: ProjectDecisionData[] = decisions.map((d) => ({
    id: d.id,
    description: d.description,
    motif: d.motif,
    impact: d.impact,
    statut: d.statut,
    responsableName: d.responsable?.name ?? null,
    echeance: d.echeance ? d.echeance.toISOString() : null,
    taskId: d.taskId,
    createdAt: d.createdAt.toISOString() }));

  const indicatorRows: IndicatorData[] = indicators.map((i) => ({
    id: i.id,
    nom: i.nom,
    unite: i.unite,
    valeurCible: Number(i.valeurCible),
    valeurActuelle: Number(i.valeurActuelle),
    definition: i.definition,
    formule: i.formule,
    baseline: i.baseline !== null ? Number(i.baseline) : null,
    source: i.source,
    frequence: i.frequence,
    responsableId: i.responsableId,
    responsableName: i.responsable?.name ?? null,
    desagregation: i.desagregation }));

  const ganttRows: GanttTaskRow[] = tasks.map((t) => ({
    id: t.id,
    titre: t.titre,
    description: t.description,
    projectNom: project.nom,
    statut: t.statut,
    priorite: t.priorite,
    responsablePrincipalId: t.responsablePrincipalId,
    responsableNom: t.responsablePrincipal.name,
    echeance: t.echeance ? t.echeance.toISOString() : null,
    dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
    tempsEstimeHeures: t.tempsEstimeHeures ? Number(t.tempsEstimeHeures) : null,
    avancement: t.avancement }));

  const mindMapRows: MindMapTaskRow[] = tasks.map((t, i) => ({
    ...ganttRows[i],
    parentTaskId: t.parentTaskId }));

  const mapProject =
    project.latitude !== null && project.longitude !== null
      ? {
          id: project.id,
          nom: project.nom,
          statut: project.statut,
          avancement: project.avancement,
          localisation: project.localisation,
          latitude: project.latitude,
          longitude: project.longitude }
      : null;

  const financementRows: FinancementRow[] = financements.map((f) => ({
    id: f.id,
    bailleur: f.bailleur,
    montant: Number(f.montant),
    statut: f.statut,
    source: f.source,
    convention: f.convention,
    periodeDebut: f.periodeDebut ? f.periodeDebut.toISOString() : null,
    periodeFin: f.periodeFin ? f.periodeFin.toISOString() : null,
    conditions: f.conditions,
    livrablesRequis: f.livrablesRequis,
    rapportsRequis: f.rapportsRequis,
    indicateursImposes: f.indicateursImposes,
    dateObtention: f.dateObtention ? f.dateObtention.toISOString() : null,
    dateEcheance: f.dateEcheance ? f.dateEcheance.toISOString() : null,
    notes: f.notes }));

  const raciSections: RaciSectionData[] = sections.map((s) => ({
    id: s.id,
    nom: s.nom,
    assignments: raciAssignments
      .filter((a) => a.sectionId === s.id)
      .map((a) => ({ id: a.id, userId: a.userId, userName: a.user.name, role: a.role })) }));
  const raciIssuesRaw = await checkRaciConsistency(project.id);
  const raciIssues: RaciConsistencyIssueData[] = raciIssuesRaw.map((issue) => ({
    userName: issue.userName,
    ancestorSectionNom: issue.ancestorSectionNom,
    descendantSectionNom: issue.descendantSectionNom }));

  const assumptionRows: AssumptionRow[] = assumptions.map((a) => ({
    id: a.id,
    hypothese: a.hypothese,
    statut: a.statut,
    notes: a.notes }));

  const budgetLineRows: BudgetLineRow[] = budgetLines.map((l) => ({
    id: l.id,
    sectionId: l.sectionId,
    sectionNom: l.section?.nom ?? null,
    categorie: l.categorie,
    libelle: l.libelle,
    montantPrevu: Number(l.montantPrevu),
    montantEngage: Number(l.montantEngage),
    montantPaye: Number(l.montantPaye) }));
  const budgetRollup = await computeBudgetRollup(project.id);
  const budgetByActivity: BudgetRollupRow[] = budgetRollup.byActivity.map((row) => ({
    id: row.sectionId,
    label: row.sectionNom,
    prevu: row.totals.prevu,
    engage: row.totals.engage,
    paye: row.totals.paye }));
  const budgetByToCNode: BudgetRollupRow[] = budgetRollup.byToCNode.map((row) => ({
    id: row.nodeId,
    label: row.nodeTitre,
    sub: row.niveau,
    prevu: row.totals.prevu,
    engage: row.totals.engage,
    paye: row.totals.paye }));

  const fundingOpportunityRows: FundingOpportunityRow[] = fundingOpportunities.map((o) => ({
    id: o.id,
    bailleur: o.bailleur,
    deadline: o.deadline ? o.deadline.toISOString() : null,
    budgetDisponible: o.budgetDisponible ? Number(o.budgetDisponible) : null,
    criteres: o.criteres,
    exigences: o.exigences }));

  const issueRows: IncidentCardData[] = issues.map((i) => ({
    id: i.id,
    type: i.type,
    titre: i.titre,
    description: i.description,
    criticite: i.criticite,
    statut: i.statut,
    estEscalade: i.estEscalade,
    declarePar: { name: i.declarePar.name },
    dateDeclaration: i.dateDeclaration,
    project: null,
    photos: i.photos,
    impact: i.impact,
    actionCorrective: i.actionCorrective }));

  const changeRequestRows: ChangeRequestRow[] = changeRequests.map((cr) => ({
    id: cr.id,
    titre: cr.titre,
    description: cr.description,
    budgetPropose: cr.budgetPropose ? Number(cr.budgetPropose) : null,
    dateFinProposee: cr.dateFinProposee ? cr.dateFinProposee.toISOString() : null,
    impactRessources: cr.impactRessources,
    impactRisques: cr.impactRisques,
    impactResultats: cr.impactResultats,
    statut: cr.statut,
    demandeParName: cr.demandePar.name,
    commentaireDecision: cr.commentaireDecision }));

  const qualityPlanData: QualityPlanData | null = qualityPlanDoc
    ? { id: qualityPlanDoc.id, titre: qualityPlanDoc.titre, contenu: qualityPlanDoc.contenu, statut: qualityPlanDoc.statut }
    : null;

  const qualityControlRows: QualityControlRow[] = qualityControls.map((c) => ({
    id: c.id,
    titre: c.titre,
    resultat: c.resultat,
    commentaire: c.commentaire,
    nonConformite: c.nonConformite,
    actionCorrective: c.actionCorrective,
    dateControle: c.dateControle.toISOString(),
    deliverableNom: c.deliverable?.nom ?? null,
    responsableName: c.responsable?.name ?? null,
    controleParName: c.controlePar.name,
    checklistItems: c.checklist.map((it) => ({ id: it.id, label: it.label, isDone: it.isDone })) }));

  const procurementItemRows: ProcurementItemRow[] = procurementItems.map((p) => ({
    id: p.id,
    besoin: p.besoin,
    specifications: p.specifications,
    quantite: p.quantite ? Number(p.quantite) : null,
    budget: p.budget ? Number(p.budget) : null,
    fournisseurNom: p.fournisseur?.nom ?? null,
    methodeAchat: p.methodeAchat,
    echeance: p.echeance ? p.echeance.toISOString() : null,
    statut: p.statut }));

  const contractRows: ContractRow[] = projectContracts.map((c) => ({
    id: c.id,
    nom: c.nom,
    fournisseurNom: c.fournisseur.nom,
    montant: c.montant ? Number(c.montant) : null,
    statut: c.statut,
    evaluationNote: c.evaluationNote,
    evaluationCommentaire: c.evaluationCommentaire,
    deliverableNoms: c.deliverables.map((d) => d.nom),
    payments: c.payments.map((p) => ({
      id: p.id,
      montant: Number(p.montant),
      datePaiement: p.datePaiement ? p.datePaiement.toISOString() : null,
      statut: p.statut,
      reference: p.reference })) }));
  const fournisseurOptions = fournisseurs.map((f) => ({ id: f.id, label: f.nom }));
  const unlinkedDeliverableOptions = deliverables.filter((d) => !d.contractId).map((d) => ({ id: d.id, label: d.nom }));

  const communicationPlanEntryRows: CommunicationPlanEntryRow[] = communicationPlanEntries.map((e) => ({
    id: e.id,
    public: e.public,
    message: e.message,
    canal: e.canal,
    frequence: e.frequence,
    responsableName: e.responsable?.name ?? null }));

  const beneficiaireRows: BeneficiaireRow[] = beneficiaires.map((b) => ({
    id: b.id,
    nom: b.nom,
    description: b.description,
    type: b.type,
    nombre: b.nombre,
    caracteristiques: b.caracteristiques,
    localisation: b.localisation,
    besoins: b.besoins,
    vulnerabilites: b.vulnerabilites,
    criteresSelection: b.criteresSelection }));

  const feedbackRows: FeedbackRow[] = feedbacks.map((f) => ({
    id: f.id,
    type: f.type,
    contenu: f.contenu,
    note: f.note,
    auteurNom: f.auteurNom,
    statut: f.statut,
    reponse: f.reponse,
    createdAt: f.createdAt.toISOString() }));

  const meEvaluationRows: MEEvaluationRow[] = meEvaluations.map((e) => ({
    id: e.id,
    titre: e.titre,
    dateEvaluation: e.dateEvaluation.toISOString(),
    evaluateurNom: e.evaluateurNom,
    conclusions: e.conclusions,
    recommandations: e.recommandations,
    criteres: e.criteres.map((c) => ({
      id: c.id,
      critere: c.critere,
      note: c.note,
      commentaire: c.commentaire })) }));

  const dataFormRows: DataFormRow[] = dataForms.map((f) => ({
    id: f.id,
    nom: f.nom,
    description: f.description,
    actif: f.actif,
    fields: f.fields.map((fl) => ({
      id: fl.id,
      label: fl.label,
      type: fl.type,
      options: fl.options,
      requis: fl.requis,
      indicatorNom: fl.indicator?.nom ?? null })),
    submissions: f.submissions.map((s) => ({
      id: s.id,
      data: s.data as Record<string, string>,
      submittedByName: s.submittedBy?.name ?? null,
      submittedAt: s.submittedAt.toISOString() })) }));

  const diagnosticData: ProjectDiagnosticData | null = diagnostic
    ? {
        id: diagnostic.id,
        analyseContexte: diagnostic.analyseContexte,
        analyseBesoins: diagnostic.analyseBesoins,
        analyseCauses: diagnostic.analyseCauses,
        analyseConsequences: diagnostic.analyseConsequences,
        donneesStatistiques: diagnostic.donneesStatistiques,
        enquetes: diagnostic.enquetes,
        consultations: diagnostic.consultations,
        etudesExistantes: diagnostic.etudesExistantes,
        analyseDocumentaire: diagnostic.analyseDocumentaire }
    : null;

  const problemTreeFlat: ProblemTreeNodeData[] = problemTree.map((n) => ({
    id: n.id,
    parentId: n.parentId,
    type: n.type,
    titre: n.titre,
    description: n.description,
    sources: n.sources,
    documents: n.linkedDocuments.map((l) => ({ linkId: l.id, documentId: l.documentId, nom: l.document.nom })),
    indicators: n.linkedIndicators.map((l) => ({ linkId: l.id, indicatorId: l.indicatorId, nom: l.indicator.nom })),
    comments: n.comments.map((c) => ({
      id: c.id,
      authorName: c.author.name,
      content: c.content,
      createdAt: c.createdAt.toISOString() })) }));
  const problemTreeRoots = buildTree(problemTreeFlat);

  const solutionTreeFlat: SolutionTreeNodeData[] = solutionTree.map((n) => ({
    id: n.id,
    parentId: n.parentId,
    type: n.type,
    titre: n.titre,
    description: n.description }));
  const solutionTreeRoots = buildTree(solutionTreeFlat);

  const taskTitreById = new Map(tasks.map((t) => [t.id, t.titre]));
  const resourceRows: ProjectResourceData[] = resources.map((r) => ({
    id: r.id,
    nom: r.nom,
    type: r.type,
    quantite: r.quantite !== null ? Number(r.quantite) : null,
    unite: r.unite,
    coutUnitaire: r.coutUnitaire !== null ? Number(r.coutUnitaire) : null,
    taskId: r.taskId,
    taskTitre: r.taskId ? (taskTitreById.get(r.taskId) ?? null) : null }));
  const taskOptions = tasks.map((t) => ({ id: t.id, label: t.titre }));

  const ganttDependencies: GanttDependency[] = taskDependencies.map((d) => ({
    taskId: d.taskId,
    dependsOnTaskId: d.dependsOnTaskId,
    type: d.type }));

  const TOC_LEVEL_LABELS: Record<string, string> = {
    INPUT: "Input",
    ACTIVITE: "Activité",
    OUTPUT: "Output",
    OUTCOME: "Outcome",
    IMPACT: "Impact" };
  const tocNodeOptions = theoryOfChangeNodes.map((n) => ({ id: n.id, label: `[${TOC_LEVEL_LABELS[n.niveau]}] ${n.titre}` }));

  const theoryOfChangeData: TheoryOfChangeNodeData[] = theoryOfChangeNodes.map((n) => ({
    id: n.id,
    niveau: n.niveau,
    titre: n.titre,
    description: n.description,
    hypotheses: n.hypotheses,
    risques: n.risques,
    conditions: n.conditions,
    indicateurs: n.indicateurs,
    sourcesVerification: n.sourcesVerification,
    indicatorCount: n._count.indicators }));

  const resultFrameworkTiers = computeResultFramework({
    nodes: theoryOfChangeNodes.map((n) => ({
      id: n.id,
      niveau: n.niveau,
      parentId: n.parentId,
      sectionIds: n.sections.map((s) => s.id) })),
    tasks: tasks.map((t) => ({ statut: t.statut, sectionId: t.sectionId })) });

  const feedbackSummary = computeFeedbackSummary(feedbackRows);

  const healthScore = computeHealthScore({
    pilotage,
    resultFrameworkTiers,
    satisfactionMoyenne: feedbackSummary.satisfactionMoyenne });

  const achievementSummary = computeAchievementSummary({
    objectives: objectives.map((o) => ({ statut: o.statut })),
    pilotage,
    resultFrameworkTiers,
    satisfactionMoyenne: feedbackSummary.satisfactionMoyenne });

  const postMortem = computePostMortem({
    budget: project.budget ? Number(project.budget) : null,
    coutReel: project.coutReel ? Number(project.coutReel) : null,
    devise,
    dateFin: project.dateFin,
    dateFinReelle: project.dateFinReelle,
    sections: sections.map((s) => ({ statut: s.statut })),
    pilotage,
    resultFrameworkTiers });

  const closureItems = computeClosureChecklist({
    deliverables: deliverables.map((d) => ({ statut: d.statut })),
    contracts: projectContracts.map((c) => ({ statut: c.statut })),
    payments: projectContracts.flatMap((c) => c.payments.map((p) => ({ statut: p.statut }))),
    risks: risks.map((r) => ({ statut: r.statut })),
    manual: {
      documentsArchives: closureChecklist?.documentsArchives ?? false,
      actifsTransferes: closureChecklist?.actifsTransferes ?? false,
      rapportsRemis: closureChecklist?.rapportsRemis ?? false,
      beneficiairesInformes: closureChecklist?.beneficiairesInformes ?? false,
      partenairesInformes: closureChecklist?.partenairesInformes ?? false } });

  const lessonRows: LessonLearnedRow[] = lessonsLearned.map((l) => ({
    id: l.id,
    type: l.type,
    titre: l.titre,
    pourquoi: l.pourquoi,
    actionRetenue: l.actionRetenue,
    recommandations: l.recommandations,
    createdAt: l.createdAt.toISOString() }));

  const memberRows: ProjectMemberRow[] = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    userName: m.user.name,
    roleOnProject: m.roleOnProject }));

  const partnerRows: ProjectPartnerRow[] = projectPartners.map((p) => ({
    id: p.id,
    crmOrganizationId: p.crmOrganizationId,
    nom: p.crmOrganization.nom,
    role: p.role }));
  const partnerOrganizationOptions = partnerOrganizations.map((o) => ({ id: o.id, label: o.nom }));

  const meetingRows: ProjectMeetingRow[] = projectMeetings.map((m) => ({
    id: m.id,
    titre: m.titre,
    dateHeure: m.dateHeure.toISOString(),
    statut: m.statut }));

  const logframeData: LogframeRowData[] = logframeRows.map((r) => ({
    id: r.id,
    niveau: r.niveau,
    resultats: r.resultats,
    indicateurs: r.indicateurs,
    sources: r.sources,
    hypotheses: r.hypotheses,
    theoryOfChangeNodeId: r.theoryOfChangeNodeId }));

  const objectiveNodes: ObjectiveNodeData[] = objectives.map((o) => ({
    id: o.id,
    titre: o.titre,
    niveau: o.niveau!,
    parentId: o.parentId,
    statut: o.statut,
    smartSpecifique: o.smartSpecifique,
    smartMesurable: o.smartMesurable,
    smartAtteignable: o.smartAtteignable,
    smartPertinent: o.smartPertinent,
    smartTemporel: o.smartTemporel }));
  const objectiveTree = buildTree(objectiveNodes).filter((n) => n.niveau === "GENERAL");

  const criticalPath = computeCriticalPath(
    tasks.map((t) => ({
      id: t.id,
      titre: t.titre,
      dateDebut: t.dateDebut,
      echeance: t.echeance,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null })),
    taskDependencies
  );
  const tasksWithDateDebut = tasks.filter((t) => t.dateDebut).map((t) => t.dateDebut!.getTime());
  const criticalPathAnchor = tasksWithDateDebut.length > 0 ? new Date(Math.min(...tasksWithDateDebut)).toISOString() : null;

  const milestoneRows: MilestoneRow[] = milestones.map((m) => ({
    id: m.id,
    nom: m.nom,
    description: m.description,
    dateCible: m.dateCible.toISOString(),
    dateReelle: m.dateReelle ? m.dateReelle.toISOString() : null,
    statut: m.statut,
    valideurName: m.valideur?.name ?? null,
    valideLe: m.valideLe ? m.valideLe.toISOString() : null,
    dependencies: milestoneDependencyRowsById.get(m.id) ?? [] }));

  const deliverableRows: DeliverableRow[] = deliverables.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    statut: d.statut,
    echeance: d.echeance ? d.echeance.toISOString() : null,
    responsableId: d.responsableId,
    responsableName: d.responsable?.name ?? null,
    criteresAcceptation: d.criteresAcceptation,
    version: d.version,
    valideurName: d.valideur?.name ?? null,
    valideLe: d.valideLe ? d.valideLe.toISOString() : null }));

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
    estArchive: d.estArchive }));

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
      connecteur: c.connecteur })),
    executions: r.executions.map((e) => ({
      id: e.id,
      resultat: e.resultat,
      executedAt: e.executedAt.toISOString() })) }));


  return {
    session,
    canManageAutomation,
    canReadWorkload,
    canManageWorkload,
    canUpdateProject,
    canDeleteProject,
    devise,
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
    beneficiaires,
    feedbacks,
    meEvaluations,
    dataForms,
    projectMeetings,
    closureChecklist,
    lessonsLearned,
    diagnostic,
    problemTree,
    allProjectDocuments,
    solutionTree,
    theoryOfChangeNodes,
    logframeRows,
    objectives,
    taskDependencies,
    raciAssignments,
    assumptions,
    budgetLines,
    fundingOpportunities,
    issues,
    changeRequests,
    qualityPlanDoc,
    qualityControls,
    procurementItems,
    projectContracts,
    fournisseurs,
    communicationPlanEntries,
    projectPartners,
    partnerOrganizations,
    entityScope,
    allowedDepartmentIds,
    conversationId,
    conversation,
    conversationMessages,
    projectWorkload,
    pilotage,
    evm,
    prediction,
    objectivesConsistencyIssues,
    dependencyLabels,
    dependencyRows,
    otherProjects,
    dependencyOptionsByType,
    milestoneIds,
    milestoneDependencies,
    milestoneDependencyLabels,
    milestoneDependencyRowsById,
    responsableById,
    nodeById,
    roots,
    userOptions,
    contactOptions,
    riskRows,
    stakeholderRows,
    availableStakeholders,
    decisionRows,
    indicatorRows,
    ganttRows,
    mindMapRows,
    mapProject,
    financementRows,
    raciSections,
    raciIssuesRaw,
    raciIssues,
    assumptionRows,
    budgetLineRows,
    budgetRollup,
    budgetByActivity,
    budgetByToCNode,
    fundingOpportunityRows,
    issueRows,
    changeRequestRows,
    qualityPlanData,
    qualityControlRows,
    procurementItemRows,
    contractRows,
    fournisseurOptions,
    unlinkedDeliverableOptions,
    communicationPlanEntryRows,
    beneficiaireRows,
    feedbackRows,
    meEvaluationRows,
    dataFormRows,
    diagnosticData,
    problemTreeFlat,
    problemTreeRoots,
    solutionTreeFlat,
    solutionTreeRoots,
    taskTitreById,
    resourceRows,
    taskOptions,
    ganttDependencies,
    TOC_LEVEL_LABELS,
    tocNodeOptions,
    theoryOfChangeData,
    resultFrameworkTiers,
    feedbackSummary,
    healthScore,
    achievementSummary,
    postMortem,
    closureItems,
    lessonRows,
    memberRows,
    partnerRows,
    partnerOrganizationOptions,
    meetingRows,
    logframeData,
    objectiveNodes,
    objectiveTree,
    criticalPath,
    tasksWithDateDebut,
    criticalPathAnchor,
    milestoneRows,
    deliverableRows,
    folderNodeById,
    folderRoots,
    folderOptions,
    documentRows,
    ruleData };
}
