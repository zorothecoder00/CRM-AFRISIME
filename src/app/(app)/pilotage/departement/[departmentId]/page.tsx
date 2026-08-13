import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeScopePilotage, getDepartmentScope, getDirectTeamScope } from "@/lib/pilotage-levels";
import {
  departmentLevelLabel,
  computeDepartmentDepth,
  directChildren,
  buildBreadcrumb,
} from "@/lib/department-tree";
import { ScopePilotagePanel } from "@/components/pilotage/scope-pilotage-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { UserAvatar } from "@/components/messages/user-avatar";
import { ChevronRight, Building2 } from "lucide-react";

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

/**
 * Niveaux 2/3/4 — Direction/Département/Service (cahier des charges §XXIII).
 * Le libellé de niveau est dérivé de la profondeur dans l'arbre Department,
 * pas d'un champ dédié. Affiche systématiquement : le roll-up (ce noeud +
 * descendants), les sous-unités pour continuer la descente, et l'équipe +
 * les projets rattachés directement à ce noeud (niveaux 5 et 6).
 */
export default async function DepartmentPilotagePage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }

  const allDepartments = await prisma.department.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });
  const byId = new Map(allDepartments.map((d) => [d.id, d]));
  const department = byId.get(departmentId);
  if (!department) {
    notFound();
  }

  const depth = computeDepartmentDepth(departmentId, byId);
  const levelLabel = departmentLevelLabel(depth);
  const breadcrumb = buildBreadcrumb(departmentId, byId);
  const children = directChildren(departmentId, allDepartments);

  const [scope, { members, projects }, teams] = await Promise.all([
    getDepartmentScope(departmentId, allDepartments),
    getDirectTeamScope(departmentId),
    prisma.team.findMany({
      where: { departmentId },
      include: { leader: true, _count: { select: { members: true } } },
      orderBy: { nom: "asc" },
    }),
  ]);
  const [pilotage, childrenPilotage] = await Promise.all([
    computeScopePilotage(scope),
    Promise.all(
      children.map(async (child) => {
        const childScope = await getDepartmentScope(child.id, allDepartments);
        const childPilotage = await computeScopePilotage(childScope);
        return { child, pilotage: childPilotage };
      })
    ),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/pilotage" className="hover:underline">
            Organisation
          </Link>
          {breadcrumb.map((d) => (
            <span key={d.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              {d.id === departmentId ? (
                <span className="font-medium text-foreground">{d.name}</span>
              ) : (
                <Link href={`/pilotage/departement/${d.id}`} className="hover:underline">
                  {d.name}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{department.name}</h1>
          <Badge variant="secondary">Niveau — {levelLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Indicateurs cumulés pour {department.name} et ses sous-unités.
        </p>
      </div>

      <ScopePilotagePanel pilotage={pilotage} />

      {children.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">
            {departmentLevelLabel(depth + 1)}s ({children.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {childrenPilotage.map(({ child, pilotage: cp }) => (
              <Link key={child.id} href={`/pilotage/departement/${child.id}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{child.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{cp.headcount} personne(s)</Badge>
                      <Badge variant="outline">{cp.projectsActifs} projet(s) actif(s)</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avancement moyen : {cp.avancementMoyen !== null ? `${cp.avancementMoyen}%` : "—"}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Équipe rattachée directement ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun collaborateur rattaché directement à cette unité.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <Link key={m.id} href={`/pilotage/utilisateur/${m.id}`}>
                <Card className="transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 py-3">
                    <UserAvatar name={m.name} image={m.image} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.role.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {teams.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Équipes de cette unité ({teams.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <Card key={t.id} size="sm">
                <CardContent className="space-y-1 py-3">
                  <div className="text-sm font-medium">{t.nom}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{t._count.members} membre(s)</Badge>
                    {t.leader && <Badge variant="secondary">{t.leader.name}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Projets de cette unité ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun projet rattaché directement à cette unité.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projets/${p.id}`}>
                <Card
                  accent={accentForStatus(p.statut)}
                  className="transition-all hover:-translate-y-0.5 hover:bg-muted/50"
                >
                  <CardContent className="space-y-1 py-3">
                    <div className="text-sm font-medium">{p.nom}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={toneForStatus(p.statut)}>{PROJECT_STATUS_LABELS[p.statut]}</Badge>
                      <span className="text-xs text-muted-foreground">{p.avancement}%</span>
                    </div>
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
