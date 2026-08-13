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
import { WorkloadTable } from "@/components/workload/workload-table";
import { ProjectCoutReelForm } from "@/components/projects/project-cout-reel-form";
import { ProjectSponsorForm } from "@/components/projects/project-sponsor-form";
import { ProjectLocationForm } from "@/components/projects/project-location-form";
import { ProjectRisksSection, type RiskRow } from "@/components/projects/project-risks-section";
import { ProjectStakeholdersSection, type StakeholderRow } from "@/components/projects/project-stakeholders-section";
import { ProjectMilestonesSection, type MilestoneRow } from "@/components/projects/project-milestones-section";
import { ProjectDeliverablesSection, type DeliverableRow } from "@/components/projects/project-deliverables-section";

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

  const [project, sections, tasks, users, folders, rootDocuments, rules, members, leaves, risks, stakeholders, milestones, deliverables, contacts] =
    await Promise.all([
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
      where: { projectId },
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
      where: { projectId, folderId: null },
      include: { uploadedBy: true, task: true, meeting: true, _count: { select: { versions: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.automationRule.findMany({
      where: { projectId },
      include: { executions: { orderBy: { executedAt: "desc" }, take: 5 } },
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
    prisma.projectStakeholder.findMany({
      where: { projectId },
      include: { user: true, contact: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectMilestone.findMany({ where: { projectId }, orderBy: { dateCible: "asc" } }),
    prisma.projectDeliverable.findMany({
      where: { projectId },
      include: { responsable: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" }, select: { id: true, prenom: true, nom: true } }),
  ]);

  if (!project) {
    notFound();
  }

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

  const stakeholderRows: StakeholderRow[] = stakeholders.map((s) => ({
    id: s.id,
    nom: s.nom,
    role: s.role,
    influence: s.influence,
    interet: s.interet,
    notes: s.notes,
    userName: s.user?.name ?? null,
    contactName: s.contact ? `${s.contact.prenom} ${s.contact.nom}` : null,
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
    uploadedByName: d.uploadedBy.name,
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: d.task?.titre ?? null,
    taskId: d.taskId,
    meetingTitre: d.meeting?.titre ?? null,
    meetingId: d.meetingId,
  }));

  const ruleData: RuleData[] = rules.map((r) => ({
    id: r.id,
    nom: r.nom,
    trigger: r.trigger,
    action: r.action,
    isActive: r.isActive,
    nextTaskTitre: r.nextTaskTitre,
    executions: r.executions.map((e) => ({
      id: e.id,
      resultat: e.resultat,
      executedAt: e.executedAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{project.nom}</h1>
          <Badge variant={toneForStatus(project.statut)}>{STATUS_LABELS[project.statut]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.description || "Pas de description."}
        </p>
      </div>

      <Tabs defaultValue="apercu">
        <TabsList>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="hierarchie">Hiérarchie</TabsTrigger>
          <TabsTrigger value="taches">Tâches</TabsTrigger>
          <TabsTrigger value="jalons">Jalons</TabsTrigger>
          <TabsTrigger value="livrables">Livrables</TabsTrigger>
          <TabsTrigger value="risques">Risques</TabsTrigger>
          <TabsTrigger value="parties-prenantes">Parties prenantes</TabsTrigger>
          {canReadWorkload && <TabsTrigger value="charge">Charge de travail</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
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
              <Info label="Budget" value={project.budget ? `${project.budget} FCFA` : "—"} />
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
                  initialLatitude={project.latitude}
                  initialLongitude={project.longitude}
                />
              ) : (
                <p className="text-sm font-medium">{project.localisation || "—"}</p>
              )}
            </CardContent>
            <CardContent className="pt-0">
              <div className="mb-1 text-xs text-muted-foreground">Coût réel</div>
              {canUpdateProject ? (
                <ProjectCoutReelForm
                  projectId={project.id}
                  budget={project.budget ? Number(project.budget) : null}
                  initialValue={project.coutReel ? Number(project.coutReel) : null}
                />
              ) : (
                <p className="text-sm font-medium">
                  {project.coutReel ? `${project.coutReel} FCFA` : "—"}
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

        <TabsContent value="automatisations" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Règles « si... alors... » déclenchées automatiquement pour ce projet.
            </p>
            {canManageAutomation && (
              <RuleFormDialog projectId={project.id} users={userOptions} />
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
