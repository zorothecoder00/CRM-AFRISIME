import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeScopePilotage, getDepartmentScope } from "@/lib/pilotage-levels";
import { ScopePilotagePanel } from "@/components/pilotage/scope-pilotage-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrganizationDevise } from "@/lib/currency";
import { Building2 } from "lucide-react";

/**
 * Niveau 1 — Organisation (cahier des charges §XXIII, "Les niveaux de
 * pilotage"). Point d'entrée du drill-down : indicateurs pour l'ensemble de
 * l'organisation, puis une carte par Direction (racine de l'arbre
 * Department) vers /pilotage/departement/[id] pour descendre aux niveaux
 * suivants (Département, Service, Équipe, Projet, Individu).
 */
export default async function PilotagePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }

  const [users, projects, allDepartments, devise] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true } }),
    prisma.project.findMany({ select: { id: true } }),
    prisma.department.findMany({ select: { id: true, name: true, parentId: true }, orderBy: { name: "asc" } }),
    getOrganizationDevise(),
  ]);

  const orgPilotage = await computeScopePilotage({
    userIds: users.map((u) => u.id),
    projectIds: projects.map((p) => p.id),
  });

  const directions = allDepartments.filter((d) => !d.parentId);
  const directionsPilotage = await Promise.all(
    directions.map(async (direction) => {
      const scope = await getDepartmentScope(direction.id, allDepartments);
      const pilotage = await computeScopePilotage(scope);
      return { direction, pilotage };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Niveaux de pilotage</h1>
        <p className="text-sm text-muted-foreground">
          Niveau 1 — Organisation. Descendez vers une direction pour affiner (Département → Service → Équipe →
          Projet → Individu).
        </p>
      </div>

      <ScopePilotagePanel pilotage={orgPilotage} devise={devise} />

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Directions ({directions.length})</h2>
        {directions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune direction créée pour le moment.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {directionsPilotage.map(({ direction, pilotage }) => (
              <Link key={direction.id} href={`/pilotage/departement/${direction.id}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{direction.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{pilotage.headcount} personne(s)</Badge>
                      <Badge variant="outline">{pilotage.projectsActifs} projet(s) actif(s)</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avancement moyen : {pilotage.avancementMoyen !== null ? `${pilotage.avancementMoyen}%` : "—"}
                    </div>
                    {pilotage.tachesEnRetard > 0 && (
                      <Badge variant="destructive">{pilotage.tachesEnRetard} tâche(s) en retard</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
