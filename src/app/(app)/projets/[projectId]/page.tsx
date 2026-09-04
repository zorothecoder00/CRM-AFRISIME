import { loadProjectPageData } from "@/lib/project-page-data";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForTaskStatus, accentForStatus } from "@/lib/status-tone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderTree } from "@/components/documents/folder-tree";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList } from "@/components/documents/document-list";
import { RuleFormDialog } from "@/components/automation/rule-form-dialog";
import { RuleList } from "@/components/automation/rule-list";
import { WorkloadTable } from "@/components/workload/workload-table";
import { ProjectCoutReelForm } from "@/components/projects/project-cout-reel-form";
import { ProjectSponsorForm } from "@/components/projects/project-sponsor-form";
import { ProjectMethodologieForm } from "@/components/projects/project-methodologie-form";
import { ProjectLocationForm } from "@/components/projects/project-location-form";
import { ProjectRisksSection } from "@/components/projects/project-risks-section";
import { ProjectStakeholdersSection } from "@/components/projects/project-stakeholders-section";
import { ProjectMilestonesSection } from "@/components/projects/project-milestones-section";
import { ProjectDeliverablesSection } from "@/components/projects/project-deliverables-section";
import { ProjectPilotagePanel } from "@/components/projects/project-pilotage-panel";
import { DependencyFormDialog } from "@/components/dependencies/dependency-form-dialog";
import { DependencyList } from "@/components/dependencies/dependency-list";
import { MessageThread } from "@/components/messages/message-thread";
import { ProjectDecisionsSection } from "@/components/projects/project-decisions-section";
import { ProjectResourcesSection } from "@/components/projects/project-resources-section";
import { ProjectTeamSection } from "@/components/projects/project-team-section";
import { ProjectMeetingsSection } from "@/components/projects/project-meetings-section";
import { ProjectReportsSection } from "@/components/projects/project-reports-section";
import { TaskTimelineView } from "@/components/tasks/task-timeline-view";
import { TaskGanttView } from "@/components/tasks/task-gantt-view";
import { EntityTagsEditor } from "@/components/tags/entity-tags-editor";
import { DeleteToTrashButton } from "@/components/trash/delete-to-trash-button";
import { TrashItemActions } from "@/components/trash/trash-item-actions";
import { GenerateStandardFoldersButton } from "@/components/documents/generate-standard-folders-button";
import { Sparkles } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const METHODOLOGIE_LABELS: Record<string, string> = {
  AGILE_SCRUM: "Agile Scrum",
  KANBAN: "Kanban",
  WATERFALL: "Prédictif (Waterfall)",
  HYBRIDE: "Hybride (Agile + Waterfall)",
  RBM: "Results-Based Management",
  LOGICAL_FRAMEWORK: "Cadre logique (Logical Framework)",
  THEORY_OF_CHANGE: "Théorie du changement",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const {
    session,
    canManageAutomation,
    canReadWorkload,
    canManageWorkload,
    canUpdateProject,
    canDeleteProject,
    devise,
    project,
    tasks,
    rules,
    members,
    tags,
    conversation,
    conversationMessages,
    projectWorkload,
    pilotage,
    prediction,
    dependencyRows,
    dependencyOptionsByType,
    userOptions,
    contactOptions,
    riskRows,
    stakeholderRows,
    availableStakeholders,
    decisionRows,
    ganttRows,
    resourceRows,
    taskOptions,
    ganttDependencies,
    memberRows,
    partnerRows,
    partnerOrganizationOptions,
    meetingRows,
    milestoneRows,
    deliverableRows,
    folderRoots,
    folderOptions,
    documentRows,
    ruleData } = await loadProjectPageData(projectId);

  // Une sous-tache (parentTaskId non nul) a deja sa place dans "Sous-taches"
  // sur la fiche de sa tache mere : l'onglet "Taches" (liste plate) n'affiche
  // que les taches racines pour eviter le doublon visuel.
  const topLevelTasks = tasks.filter((t) => !t.parentTaskId);

  return (
    <div className="space-y-6">
      <BackLink href="/projets" label="Retour aux projets" />
      {project.deletedAt && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">Ce projet a été supprimé et se trouve dans la corbeille.</p>
          {canDeleteProject && <TrashItemActions entityType="Project" id={project.id} canPurge={false} />}
        </div>
      )}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{project.nom}</h1>
            <Badge variant={toneForStatus(project.statut)}>{STATUS_LABELS[project.statut]}</Badge>
            {canDeleteProject && !project.deletedAt && <DeleteToTrashButton entityType="Project" id={project.id} />}
          </div>
          <Link href={`/projets/studio/${project.id}`}>
            <Button variant="outline" size="sm">
              <Sparkles className="mr-1 h-4 w-4" />
              Project Studio
            </Button>
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.description || "Pas de description."}
        </p>
        <div className="mt-2">
          <EntityTagsEditor entityType="Project" entityId={project.id} initialTags={tags} canManage={canUpdateProject} />
        </div>
      </div>

      <Tabs defaultValue="apercu">
        <div className="overflow-x-auto pb-1">
        <TabsList>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="pilotage">Pilotage</TabsTrigger>
          <TabsTrigger value="taches">Tâches</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="jalons">Jalons</TabsTrigger>
          <TabsTrigger value="livrables">Livrables</TabsTrigger>
          <TabsTrigger value="risques">Risques</TabsTrigger>
          <TabsTrigger value="parties-prenantes">Parties prenantes</TabsTrigger>
          <TabsTrigger value="decisions">Décisions</TabsTrigger>
          <TabsTrigger value="ressources">Ressources</TabsTrigger>
          <TabsTrigger value="equipe">Équipe</TabsTrigger>
          {canReadWorkload && <TabsTrigger value="charge">Charge de travail</TabsTrigger>}
          <TabsTrigger value="reunions">Réunions</TabsTrigger>
          <TabsTrigger value="rapports">Rapports</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="automatisations">Automatisations</TabsTrigger>
        </TabsList>
        </div>
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
              <div className="mb-1 text-xs text-muted-foreground">Méthodologie</div>
              {canUpdateProject ? (
                <ProjectMethodologieForm projectId={project.id} initialMethodologie={project.methodologie} />
              ) : (
                <p className="text-sm font-medium">
                  {project.methodologie ? METHODOLOGIE_LABELS[project.methodologie] : "—"}
                </p>
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

        <TabsContent value="taches" className="mt-4">
          <div className="space-y-2">
            {/* Une sous-tache a deja sa place dans "Sous-taches" sur la fiche
                de sa tache mere — cette liste plate n'affiche que les taches
                racines pour eviter le doublon visuel (meme logique que
                /taches, voir src/app/(app)/taches/page.tsx). */}
            {topLevelTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune tâche pour ce projet.</p>
            )}
            {topLevelTasks.map((task) => (
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
                  <Badge variant={toneForTaskStatus(task.statut)}>{TASK_STATUS_LABELS[task.statut]}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TaskTimelineView tasks={ganttRows} />
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <TaskGanttView tasks={ganttRows} dependencies={ganttDependencies} />
        </TabsContent>

        <TabsContent value="jalons" className="mt-4">
          <ProjectMilestonesSection
            projectId={project.id}
            milestones={milestoneRows}
            canManage={canUpdateProject}
            dependencyOptionsByType={dependencyOptionsByType}
          />
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

        <TabsContent value="ressources" className="mt-4">
          <ProjectResourcesSection projectId={project.id} resources={resourceRows} tasks={taskOptions} devise={devise} />
        </TabsContent>

        <TabsContent value="equipe" className="mt-4">
          <ProjectTeamSection
            projectId={project.id}
            sponsorName={project.sponsor?.name ?? null}
            responsableName={project.responsable.name}
            members={memberRows}
            users={userOptions}
            partners={partnerRows}
            availablePartnerOrganizations={partnerOrganizationOptions}
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

        <TabsContent value="reunions" className="mt-4">
          <ProjectMeetingsSection
            project={{ id: project.id, label: project.nom }}
            users={userOptions}
            meetings={meetingRows}
            canManage={canUpdateProject}
          />
        </TabsContent>

        <TabsContent value="rapports" className="mt-4">
          <ProjectReportsSection projectId={project.id} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Aperçu de la racine de l&apos;espace documentaire.
            </p>
            <div className="flex gap-2">
              <GenerateStandardFoldersButton projectId={project.id} />
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

