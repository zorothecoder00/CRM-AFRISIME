import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority, accentForStatus } from "@/lib/status-tone";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const PRIORITY_LABELS: Record<string, string> = {
  BASSE: "Basse",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  CRITIQUE: "Critique",
};

export default async function ProjetsPage() {
  const session = await getServerSession(authOptions);
  const canCreate = session!.user.permissions.includes(PERMISSIONS.PROJECT_CREATE);
  const where = projectVisibilityWhere(session!.user.roleKey, session!.user.id);

  const [projects, departments, users] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { department: true, responsable: true },
      orderBy: { updatedAt: "desc" },
    }),
    canCreate
      ? prisma.department.findMany({ orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canCreate
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projets</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} projet(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/projets/roadmap">
            <Button variant="outline" size="sm">
              Roadmap
            </Button>
          </Link>
          {canCreate && (
            <ProjectFormDialog
              departments={departments.map((d) => ({ id: d.id, label: d.name }))}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/projets/${project.id}`}>
            <Card
              accent={accentForStatus(project.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{project.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {project.description || "Pas de description."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toneForStatus(project.statut)}>{STATUS_LABELS[project.statut]}</Badge>
                  <Badge variant={toneForPriority(project.priorite)}>{PRIORITY_LABELS[project.priorite]}</Badge>
                  <Badge variant="outline">{project.department.name}</Badge>
                  {project.budget && project.coutReel && Number(project.coutReel) > Number(project.budget) && (
                    <Badge variant="destructive">Budget dépassé</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Responsable : {project.responsable.name}
                </div>
                <div className="text-xs font-medium">Avancement : {project.avancement}%</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun projet pour le moment.</p>
        )}
      </div>
    </div>
  );
}
