import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadProjectPageData } from "@/lib/project-page-data";
import { ProjectStudioPanel } from "@/components/projects/project-studio-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HierarchyTree } from "@/components/projects/hierarchy-tree";
import { ProjectEvmPanel } from "@/components/projects/project-evm-panel";
import { IndicatorList } from "@/components/objectives/indicator-list";
import { AddProjectIndicatorDialog } from "@/components/projects/add-project-indicator-dialog";
import { ProjectFinancementsSection } from "@/components/projects/project-financements-section";
import { BeneficiairesSection } from "@/components/programmes/beneficiaires-section";
import { ProjectFeedbackSection } from "@/components/projects/project-feedback-section";
import { ProjectMESection } from "@/components/projects/project-me-section";
import { ProjectDataFormsSection } from "@/components/projects/project-data-forms-section";
import { ProjectBilanView } from "@/components/projects/project-bilan-view";
import { ProjectClosureSection } from "@/components/projects/project-closure-section";
import { ProjectLessonsLearnedSection } from "@/components/projects/project-lessons-learned-section";
import { ProjectDiagnosticForm } from "@/components/projects/project-diagnostic-form";
import { ProblemTreeView } from "@/components/projects/problem-tree-view";
import { SolutionTreeView } from "@/components/projects/solution-tree-view";
import { TheoryOfChangeView } from "@/components/projects/theory-of-change-view";
import { LogframeView } from "@/components/projects/logframe-view";
import { ResultFrameworkView } from "@/components/projects/result-framework-view";
import { ProjectObjectivesBuilder } from "@/components/projects/project-objectives-builder";
import { ProjectScopeForm } from "@/components/projects/project-scope-form";
import { CriticalPathView } from "@/components/projects/critical-path-view";
import { ProjectViewsSwitcher } from "@/components/projects/project-views-switcher";
import { RaciMatrixView } from "@/components/projects/raci-matrix-view";
import { AssumptionRegisterView } from "@/components/projects/assumption-register-view";
import { ProjectBudgetSection } from "@/components/projects/project-budget-section";
import { ProjectFundingOpportunitiesSection } from "@/components/projects/project-funding-opportunities-section";
import { ProjectIssuesSection } from "@/components/projects/project-issues-section";
import { ProjectChangeRequestsSection } from "@/components/projects/project-change-requests-section";
import { ProjectQualitySection } from "@/components/projects/project-quality-section";
import { ProjectProcurementSection } from "@/components/projects/project-procurement-section";
import { ProjectContractsSection } from "@/components/projects/project-contracts-section";
import { CommunicationPlanSection } from "@/components/projects/communication-plan-section";
import { ProjectExecutionView } from "@/components/projects/project-execution-view";

/**
 * Fonctionnalités du cahier des charges Project Studio pour un projet
 * donné — page dédiée, séparée de la page projet elle-même.
 */
export default async function ProjectStudioDetailPage({
  params }: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const {
    canReadWorkload,
    canManageWorkload,
    canUpdateProject,
    devise,
    project,
    sections,
    deliverables,
    problemTree,
    allProjectDocuments,
    projectWorkload,
    pilotage,
    evm,
    objectivesConsistencyIssues,
    roots,
    userOptions,
    riskRows,
    indicatorRows,
    ganttRows,
    mindMapRows,
    mapProject,
    financementRows,
    raciSections,
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
    problemTreeRoots,
    solutionTreeRoots,
    ganttDependencies,
    tocNodeOptions,
    theoryOfChangeData,
    resultFrameworkTiers,
    healthScore,
    achievementSummary,
    postMortem,
    closureItems,
    lessonRows,
    logframeData,
    objectiveTree,
    criticalPath,
    criticalPathAnchor,
    milestoneRows,
    deliverableRows } = await loadProjectPageData(projectId);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projets/${project.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au projet
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Project Studio — {project.nom}</h1>
        <p className="text-sm text-muted-foreground">
          Conception, planification, budget, risques, qualité, exécution, suivi-évaluation et clôture — tout ce qu&apos;apporte le
          cahier des charges Project Studio pour ce projet.
        </p>
      </div>
          <ProjectStudioPanel
            defaultValue="vues"
            categories={[
              {
                nom: "Conception",
                items: [
                  {
                    value: "diagnostic",
                    label: "Diagnostic",
                    content: (
                    <div className="mt-4">
                      <ProjectDiagnosticForm projectId={project.id} diagnostic={diagnosticData} canManage={canUpdateProject} />
                    </div>
                    ) },
                  {
                    value: "arbre-problemes",
                    label: "Arbre des problèmes",
                    content: (
                    <div className="mt-4">
                      <ProblemTreeView
                        projectId={project.id}
                        nodes={problemTreeRoots}
                        canManage={canUpdateProject}
                        projectDocuments={allProjectDocuments.map((d) => ({ id: d.id, label: d.nom }))}
                        projectIndicators={indicatorRows.map((i) => ({ id: i.id, label: i.nom }))}
                      />
                    </div>
                    ) },
                  {
                    value: "arbre-solutions",
                    label: "Arbre des solutions",
                    content: (
                    <div className="mt-4">
                      <SolutionTreeView
                        projectId={project.id}
                        nodes={solutionTreeRoots}
                        hasProblemTree={problemTree.length > 0}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "theorie-changement",
                    label: "Théorie du changement",
                    content: (
                    <div className="mt-4">
                      <TheoryOfChangeView projectId={project.id} nodes={theoryOfChangeData} canManage={canUpdateProject} />
                    </div>
                    ) },
                  {
                    value: "cadre-logique",
                    label: "Cadre logique",
                    content: (
                    <div className="mt-4">
                      <LogframeView
                        projectId={project.id}
                        rows={logframeData}
                        hasTheoryOfChange={theoryOfChangeData.length > 0}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "objectifs-builder",
                    label: "Objectifs",
                    content: (
                    <div className="mt-4">
                      <ProjectObjectivesBuilder
                        projectId={project.id}
                        tree={objectiveTree}
                        issues={objectivesConsistencyIssues}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "cadre-resultats",
                    label: "Cadre de résultats",
                    content: (
                    <div className="mt-4">
                      <ResultFrameworkView tiers={resultFrameworkTiers} />
                    </div>
                    ) },
                ] },
              {
                nom: "Planification",
                items: [
                  {
                    value: "hierarchie",
                    label: "Hiérarchie",
                    content: (
                    <div className="mt-4">
                      <HierarchyTree nodes={roots} projectId={project.id} users={userOptions} tocNodes={tocNodeOptions} />
                    </div>
                    ) },
                  {
                    value: "scope",
                    label: "Périmètre",
                    content: (
                    <div className="mt-4">
                      <ProjectScopeForm
                        projectId={project.id}
                        scope={{
                          perimetreInclus: project.perimetreInclus,
                          perimetreExclus: project.perimetreExclus,
                          contraintes: project.contraintes,
                          limites: project.limites,
                          criteresReussite: project.criteresReussite,
                          gouvernance: project.gouvernance }}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "charte",
                    label: "Charte",
                    content: (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Charte générée à partir des informations déjà renseignées sur ce projet (aperçu, périmètre, livrables,
                          risques, parties prenantes).
                        </p>
                        <a href={`/api/rapports/CHARTE_PROJET?format=pdf&targetId=${project.id}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">
                            Télécharger en PDF
                          </Button>
                        </a>
                      </div>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Informations générales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                          <Info label="Sponsor" value={project.sponsor?.name || "—"} />
                          <Info label="Chef de projet" value={project.responsable.name} />
                          <Info label="Objectif" value={project.objectif || "—"} />
                          <Info label="Budget" value={project.budget ? `${project.budget} ${devise}` : "—"} />
                          <Info
                            label="Calendrier"
                            value={`${project.dateDebut ? new Date(project.dateDebut).toLocaleDateString("fr-FR") : "—"} → ${project.dateFin ? new Date(project.dateFin).toLocaleDateString("fr-FR") : "—"}`}
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Périmètre</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                          <Info label="Inclus" value={project.perimetreInclus || "—"} />
                          <Info label="Exclu" value={project.perimetreExclus || "—"} />
                          <Info label="Contraintes" value={project.contraintes || "—"} />
                          <Info label="Limites" value={project.limites || "—"} />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Gouvernance & critères de réussite</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                          <Info label="Gouvernance" value={project.gouvernance || "—"} />
                          <Info label="Critères de réussite" value={project.criteresReussite || "—"} />
                        </CardContent>
                      </Card>
                      <p className="text-xs text-muted-foreground">
                        Livrables, risques majeurs et parties prenantes détaillés dans les onglets dédiés — repris dans le PDF.
                      </p>
                    </div>
                    ) },
                  {
                    value: "chemin-critique",
                    label: "Chemin critique",
                    content: (
                    <div className="mt-4">
                      <CriticalPathView
                        results={criticalPath?.tasks ?? null}
                        projectEndDays={criticalPath?.projectEndDays ?? null}
                        anchorDate={criticalPathAnchor}
                        projectDateFin={project.dateFin ? project.dateFin.toISOString() : null}
                      />
                    </div>
                    ) },
                  {
                    value: "raci",
                    label: "RACI",
                    content: (
                    <div className="mt-4">
                      <RaciMatrixView sections={raciSections} users={userOptions} issues={raciIssues} canManage={canUpdateProject} />
                    </div>
                    ) },
                ] },
              {
                nom: "Budget & financement",
                items: [
                  {
                    value: "budget",
                    label: "Budget",
                    content: (
                    <div className="mt-4">
                      <ProjectBudgetSection
                        projectId={project.id}
                        sections={sections.map((s) => ({ id: s.id, nom: s.nom }))}
                        lines={budgetLineRows}
                        byActivity={budgetByActivity}
                        byToCNode={budgetByToCNode}
                        devise={devise}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "financement",
                    label: "Financement",
                    content: (
                    <div className="mt-4">
                      <ProjectFinancementsSection
                        projectId={project.id}
                        financements={financementRows}
                        devise={devise}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "appels-a-projets",
                    label: "Appels à projets",
                    content: (
                    <div className="mt-4 space-y-2">
                      <ProjectFundingOpportunitiesSection
                        projectId={project.id}
                        opportunities={fundingOpportunityRows}
                        devise={devise}
                        canManage={canUpdateProject}
                      />
                      <Link href="/projets/appels-a-projets" className="text-xs text-primary hover:underline">
                        Voir le pipeline global des appels à projets →
                      </Link>
                    </div>
                    ) },
                ] },
              {
                nom: "Risques, qualité & changements",
                items: [
                  {
                    value: "hypotheses",
                    label: "Hypothèses",
                    content: (
                    <div className="mt-4">
                      <AssumptionRegisterView projectId={project.id} assumptions={assumptionRows} canManage={canUpdateProject} />
                    </div>
                    ) },
                  {
                    value: "problemes",
                    label: "Problèmes",
                    content: (
                    <div className="mt-4">
                      <ProjectIssuesSection projectId={project.id} issues={issueRows} users={userOptions} canManage={canUpdateProject} />
                    </div>
                    ) },
                  {
                    value: "modifications",
                    label: "Modifications",
                    content: (
                    <div className="mt-4">
                      <ProjectChangeRequestsSection
                        projectId={project.id}
                        changeRequests={changeRequestRows}
                        budgetActuel={project.budget ? Number(project.budget) : null}
                        dateFinActuelle={project.dateFin ? project.dateFin.toISOString() : null}
                        devise={devise}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "qualite",
                    label: "Qualité",
                    content: (
                    <div className="mt-4">
                      <ProjectQualitySection
                        projectId={project.id}
                        plan={qualityPlanData}
                        controls={qualityControlRows}
                        deliverables={deliverables.map((d) => ({ id: d.id, label: d.nom }))}
                        users={userOptions}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                ] },
              {
                nom: "Achats & communication",
                items: [
                  {
                    value: "achats",
                    label: "Achats",
                    content: (
                    <div className="mt-4">
                      <ProjectProcurementSection
                        projectId={project.id}
                        items={procurementItemRows}
                        fournisseurs={fournisseurOptions}
                        devise={devise}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "contrats",
                    label: "Contrats",
                    content: (
                    <div className="mt-4">
                      <ProjectContractsSection
                        projectId={project.id}
                        contracts={contractRows}
                        fournisseurs={fournisseurOptions}
                        unlinkedDeliverables={unlinkedDeliverableOptions}
                        devise={devise}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "communication",
                    label: "Communication",
                    content: (
                    <div className="mt-4">
                      <CommunicationPlanSection
                        projectId={project.id}
                        entries={communicationPlanEntryRows}
                        users={userOptions}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                ] },
              {
                nom: "Exécution & pilotage",
                items: [
                  {
                    value: "vues",
                    label: "Vues",
                    content: (
                    <div className="mt-4">
                      <ProjectViewsSwitcher
                        projectId={project.id}
                        tasks={ganttRows}
                        dependencies={ganttDependencies}
                        mindMapTasks={mindMapRows}
                        roots={roots}
                        userOptions={userOptions}
                        tocNodeOptions={tocNodeOptions}
                        pilotage={pilotage}
                        devise={devise}
                        workload={canReadWorkload ? projectWorkload : null}
                        canManageWorkload={canManageWorkload}
                        mapProject={mapProject}
                      />
                    </div>
                    ) },
                  {
                    value: "execution",
                    label: "Exécution",
                    content: (
                    <div className="mt-4">
                      <ProjectExecutionView
                        tasks={ganttRows}
                        milestones={milestoneRows}
                        deliverables={deliverableRows}
                        risks={riskRows}
                        budgetPrevu={budgetRollup.projectTotal.prevu}
                        budgetEngage={budgetRollup.projectTotal.engage}
                        budgetPaye={budgetRollup.projectTotal.paye}
                        devise={devise}
                        avancement={project.avancement}
                      />
                    </div>
                    ) },
                  {
                    value: "evm",
                    label: "EVM",
                    content: (
                    <div className="mt-4">
                      <ProjectEvmPanel evm={evm} devise={devise} />
                    </div>
                    ) },
                  {
                    value: "kpi",
                    label: "KPI",
                    content: (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Indicateurs clés de performance du projet.</p>
                        <AddProjectIndicatorDialog projectId={project.id} users={userOptions} />
                      </div>
                      <IndicatorList indicators={indicatorRows} users={userOptions} />
                    </div>
                    ) },
                ] },
              {
                nom: "Suivi, évaluation & impact",
                items: [
                  {
                    value: "beneficiaires",
                    label: "Bénéficiaires",
                    content: (
                    <div className="mt-4">
                      <BeneficiairesSection projectId={project.id} beneficiaires={beneficiaireRows} canManage={canUpdateProject} />
                    </div>
                    ) },
                  {
                    value: "retours",
                    label: "Retours",
                    content: (
                    <div className="mt-4">
                      <ProjectFeedbackSection projectId={project.id} feedbacks={feedbackRows} canManage={canUpdateProject} />
                    </div>
                    ) },
                  {
                    value: "suivi-evaluation",
                    label: "Suivi-évaluation",
                    content: (
                    <div className="mt-4">
                      <ProjectMESection
                        projectId={project.id}
                        evaluations={meEvaluationRows}
                        indicators={indicatorRows}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "collecte",
                    label: "Collecte",
                    content: (
                    <div className="mt-4">
                      <ProjectDataFormsSection
                        projectId={project.id}
                        forms={dataFormRows}
                        indicators={indicatorRows.map((i) => ({ id: i.id, label: i.nom }))}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                ] },
              {
                nom: "Clôture & capitalisation",
                items: [
                  {
                    value: "bilan",
                    label: "Bilan",
                    content: (
                    <div className="mt-4">
                      <ProjectBilanView healthScore={healthScore} achievements={achievementSummary} postMortem={postMortem} />
                    </div>
                    ) },
                  {
                    value: "cloture",
                    label: "Clôture",
                    content: (
                    <div className="mt-4">
                      <ProjectClosureSection
                        projectId={project.id}
                        items={closureItems}
                        dateFinReelle={project.dateFinReelle ? project.dateFinReelle.toISOString().slice(0, 10) : null}
                        canManage={canUpdateProject}
                      />
                    </div>
                    ) },
                  {
                    value: "capitalisation",
                    label: "Capitalisation",
                    content: (
                    <div className="mt-4">
                      <ProjectLessonsLearnedSection projectId={project.id} lessons={lessonRows} canManage={canUpdateProject} />
                    </div>
                    ) },
                ] },
            ]}
          />
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
