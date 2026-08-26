import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { objectiveProgress } from "@/lib/objective-progress";
import { computeWorkload } from "@/lib/workload";
import { WorkloadTable } from "@/components/workload/workload-table";
import { LinkProjectForm } from "@/components/programmes/link-project-form";
import { UnlinkProjectButton } from "@/components/programmes/unlink-project-button";
import { ProgrammeCoutReelForm } from "@/components/programmes/programme-cout-reel-form";
import { ProgrammeRisksSection, type ProgrammeRiskRow } from "@/components/programmes/programme-risks-section";
import { ObjectiveFormDialog } from "@/components/objectives/objective-form-dialog";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { ProjectRoadmapView, type RoadmapProjectRow } from "@/components/projects/project-roadmap-view";
import { BeneficiairesSection } from "@/components/programmes/beneficiaires-section";
import { getOrganizationDevise } from "@/lib/currency";
import { BackLink } from "@/components/ui/back-link";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  ATTEINT: "Atteint",
  NON_ATTEINT: "Non atteint",
  ANNULE: "Annulé",
};

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ programmeId: string }>;
}) {
  const { programmeId } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROGRAM_MANAGE);
  const canReadWorkload = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_READ);
  const canManageWorkload = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_MANAGE);

  const [programme, availableProjects, users, departments, allProjects, allProgrammes, devise] = await Promise.all([
    prisma.programme.findUnique({
      where: { id: programmeId },
      include: {
        responsable: true,
        projects: { include: { department: true }, orderBy: { createdAt: "desc" } },
        objectives: { include: { indicators: true }, orderBy: { createdAt: "desc" } },
        risks: { include: { responsable: true }, orderBy: { createdAt: "desc" } },
        beneficiaires: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.project.findMany({
      where: { OR: [{ programmeId: null }, { programmeId: { not: programmeId } }] },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.programme.findMany({ orderBy: { nom: "asc" } }),
    getOrganizationDevise(),
  ]);

  if (!programme) {
    notFound();
  }

  const projectIds = programme.projects.map((p) => p.id);

  const [members, tasks, leaves] = await Promise.all([
    projectIds.length > 0
      ? prisma.projectMember.findMany({
          where: { projectId: { in: projectIds } },
          include: { user: { include: { role: true } } },
        })
      : Promise.resolve([]),
    projectIds.length > 0
      ? prisma.task.findMany({
          where: { projectId: { in: projectIds } },
          include: { assignees: { select: { userId: true } } },
        })
      : Promise.resolve([]),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
  ]);

  // Un meme collaborateur peut etre membre de plusieurs projets du programme
  // — dedupe par utilisateur avant de calculer la charge agregee.
  const uniqueMembers = Array.from(new Map(members.map((m) => [m.userId, m])).values());

  const workload = computeWorkload(
    uniqueMembers.map((m) => ({
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
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
  );

  const avancementMoyen =
    programme.projects.length > 0
      ? Math.round(programme.projects.reduce((sum, p) => sum + p.avancement, 0) / programme.projects.length)
      : 0;
  const budgetProjets = programme.projects.reduce((sum, p) => sum + (p.budget ? Number(p.budget) : 0), 0);

  const roadmapRows: RoadmapProjectRow[] = programme.projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    statut: p.statut,
    avancement: p.avancement,
    dateDebut: p.dateDebut ? p.dateDebut.toISOString() : null,
    dateFin: p.dateFin ? p.dateFin.toISOString() : null,
    departmentNom: p.department.name,
  }));

  const riskRows: ProgrammeRiskRow[] = programme.risks.map((r) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    probabilite: r.probabilite,
    impact: r.impact,
    statut: r.statut,
    planMitigation: r.planMitigation,
    responsableName: r.responsable?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <BackLink href="/programmes" label="Retour aux programmes" />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{programme.nom}</h1>
          <Badge variant={toneForStatus(programme.statut)}>{STATUS_LABELS[programme.statut]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{programme.objectif || programme.description}</p>
      </div>

      <Tabs defaultValue="apercu">
        <TabsList>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="objectifs">Objectifs</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          {canReadWorkload && <TabsTrigger value="ressources">Ressources</TabsTrigger>}
          <TabsTrigger value="risques">Risques</TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="mt-4 space-y-6">
          <Card accent={accentForStatus(programme.statut)}>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <Info label="Responsable" value={programme.responsable.name} />
              <Info
                label="Budget programme"
                value={programme.budget ? `${Number(programme.budget).toLocaleString("fr-FR")} ${devise}` : "—"}
              />
              <Info
                label="Date de début"
                value={programme.dateDebut ? programme.dateDebut.toLocaleDateString("fr-FR") : "—"}
              />
              <Info
                label="Date de fin"
                value={programme.dateFin ? programme.dateFin.toLocaleDateString("fr-FR") : "—"}
              />
              <Info label="Avancement moyen des projets" value={`${avancementMoyen}%`} />
              <Info label="Budget cumulé des projets" value={`${budgetProjets.toLocaleString("fr-FR")} ${devise}`} />
            </CardContent>
            <CardContent className="pt-0">
              <div className="mb-1 text-xs text-muted-foreground">Coût réel</div>
              {canManage ? (
                <ProgrammeCoutReelForm
                  programmeId={programme.id}
                  budget={programme.budget ? Number(programme.budget) : null}
                  initialValue={programme.coutReel ? Number(programme.coutReel) : null}
                  devise={devise}
                />
              ) : (
                <p className="text-sm font-medium">
                  {programme.coutReel ? `${programme.coutReel} ${devise}` : "—"}
                  {programme.budget && programme.coutReel && Number(programme.coutReel) > Number(programme.budget) && (
                    <Badge variant="destructive" className="ml-2">
                      Budget dépassé
                    </Badge>
                  )}
                </p>
              )}
            </CardContent>
            {programme.description && (
              <CardContent className="pt-0 text-sm text-muted-foreground">{programme.description}</CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projets associés ({programme.projects.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {programme.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun projet rattaché pour le moment.</p>
              ) : (
                <ul className="space-y-2">
                  {programme.projects.map((project) => (
                    <li
                      key={project.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <Link href={`/projets/${project.id}`} className="min-w-0 flex-1 font-medium hover:underline">
                        {project.nom}
                      </Link>
                      <span className="text-xs text-muted-foreground">{project.department.name}</span>
                      <Badge variant="outline">{project.avancement}%</Badge>
                      {canManage && <UnlinkProjectButton projectId={project.id} />}
                    </li>
                  ))}
                </ul>
              )}
              {canManage && (
                <LinkProjectForm
                  programmeId={programme.id}
                  projects={availableProjects.map((p) => ({ id: p.id, label: p.nom }))}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bénéficiaires</CardTitle>
            </CardHeader>
            <CardContent>
              <BeneficiairesSection
                programmeId={programme.id}
                beneficiaires={programme.beneficiaires.map((b) => ({
                  id: b.id,
                  nom: b.nom,
                  description: b.description,
                  type: b.type,
                  nombre: b.nombre,
                  caracteristiques: b.caracteristiques,
                  localisation: b.localisation,
                  besoins: b.besoins,
                  vulnerabilites: b.vulnerabilites,
                  criteresSelection: b.criteresSelection,
                }))}
                canManage={canManage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objectifs" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Objectifs rattachés directement à ce programme (cahier des charges §V).
            </p>
            <ObjectiveFormDialog
              users={users.map((u) => ({ id: u.id, label: u.name }))}
              projects={allProjects.map((p) => ({ id: p.id, label: p.nom }))}
              departments={departments.map((d) => ({ id: d.id, label: d.name }))}
              programmes={allProgrammes.map((p) => ({ id: p.id, label: p.nom }))}
              currentUserId={session!.user.id}
              defaultScope="PROGRAMME"
              defaultProgrammeId={programme.id}
              triggerLabel="Nouvel objectif"
            />
          </div>
          {programme.objectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun objectif rattaché à ce programme.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {programme.objectives.map((o) => {
                const progress = objectiveProgress(
                  o.indicators.map((i) => ({
                    valeurActuelle: Number(i.valeurActuelle),
                    valeurCible: Number(i.valeurCible),
                  }))
                );
                return (
                  <Link key={o.id} href={`/objectifs/${o.id}`}>
                    <Card accent={accentForStatus(o.statut)} className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-base">{o.titre}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Badge variant={toneForStatus(o.statut)}>{OBJECTIVE_STATUS_LABELS[o.statut]}</Badge>
                        <ProgressBar value={progress} />
                        <p className="text-xs text-muted-foreground">{progress}% · {o.indicators.length} indicateur(s)</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          <ProjectRoadmapView projects={roadmapRows} />
        </TabsContent>

        {canReadWorkload && (
          <TabsContent value="ressources" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Charge de l&apos;équipe cumulée sur tous les projets du programme (un même collaborateur n&apos;est compté qu&apos;une fois).
            </p>
            {uniqueMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre rattaché aux projets de ce programme.</p>
            ) : (
              <WorkloadTable rows={workload} canManage={canManageWorkload} />
            )}
          </TabsContent>
        )}

        <TabsContent value="risques" className="mt-4">
          <ProgrammeRisksSection
            programmeId={programme.id}
            risks={riskRows}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            canManage={canManage}
          />
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
