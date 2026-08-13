import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { Button } from "@/components/ui/button";
import { ProjectRoadmapView, type RoadmapProjectRow } from "@/components/projects/project-roadmap-view";

export default async function ProjectRoadmapPage() {
  const session = await getServerSession(authOptions);
  const where = projectVisibilityWhere(session!.user.roleKey, session!.user.id);

  const projects = await prisma.project.findMany({
    where,
    include: { department: true },
    orderBy: { dateDebut: "asc" },
  });

  const rows: RoadmapProjectRow[] = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    statut: p.statut,
    avancement: p.avancement,
    dateDebut: p.dateDebut ? p.dateDebut.toISOString() : null,
    dateFin: p.dateFin ? p.dateFin.toISOString() : null,
    departmentNom: p.department.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Roadmap</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} projet(s) — vue d&apos;ensemble multi-projets sur une échelle temporelle commune.
          </p>
        </div>
        <Link href="/projets">
          <Button variant="outline" size="sm">
            Retour aux projets
          </Button>
        </Link>
      </div>

      <ProjectRoadmapView projects={rows} />
    </div>
  );
}
