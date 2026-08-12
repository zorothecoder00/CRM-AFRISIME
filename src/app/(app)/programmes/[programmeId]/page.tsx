import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { LinkProjectForm } from "@/components/programmes/link-project-form";
import { UnlinkProjectButton } from "@/components/programmes/unlink-project-button";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
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

  const [programme, availableProjects] = await Promise.all([
    prisma.programme.findUnique({
      where: { id: programmeId },
      include: {
        responsable: true,
        projects: { include: { department: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.project.findMany({
      where: { OR: [{ programmeId: null }, { programmeId: { not: programmeId } }] },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
  ]);

  if (!programme) {
    notFound();
  }

  const avancementMoyen =
    programme.projects.length > 0
      ? Math.round(programme.projects.reduce((sum, p) => sum + p.avancement, 0) / programme.projects.length)
      : 0;
  const budgetProjets = programme.projects.reduce((sum, p) => sum + (p.budget ? Number(p.budget) : 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{programme.nom}</h1>
            <Badge variant={toneForStatus(programme.statut)}>{STATUS_LABELS[programme.statut]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{programme.objectif || programme.description}</p>
        </div>

        <Card accent={accentForStatus(programme.statut)}>
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Responsable" value={programme.responsable.name} />
            <Info
              label="Budget programme"
              value={programme.budget ? `${Number(programme.budget).toLocaleString("fr-FR")} FCFA` : "—"}
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
            <Info label="Budget cumulé des projets" value={`${budgetProjets.toLocaleString("fr-FR")} FCFA`} />
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
      </div>
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
