import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HierarchyTree, type SectionNode } from "@/components/projects/hierarchy-tree";

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

  const [project, sections, tasks, users] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { department: true, responsable: true },
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
      include: { responsablePrincipal: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!project) {
    notFound();
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{project.nom}</h1>
          <Badge variant="secondary">{STATUS_LABELS[project.statut]}</Badge>
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
        </TabsList>

        <TabsContent value="apercu" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <Info label="Objectif" value={project.objectif || "—"} />
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
                  <Badge variant="outline">{TASK_STATUS_LABELS[task.statut]}</Badge>
                </div>
              </Link>
            ))}
          </div>
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
