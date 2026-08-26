import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { getOrganizationDevise } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority, accentForStatus } from "@/lib/status-tone";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectTableView, type ProjectRow } from "@/components/projects/project-table-view";
import { ProjectKanbanView } from "@/components/projects/project-kanban-view";
import type { Prisma } from "@/generated/prisma/client";
import { User, Sparkles } from "lucide-react";

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

const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  ONG: "ONG",
  IT: "IT",
  EVENEMENTIEL: "Événementiel",
  FORMATION: "Formation",
  AGRICOLE: "Agricole",
  BTP: "BTP",
  DONOR_FUNDED: "Financé par bailleur",
  AUTRE: "Autre",
};

const VIEWS = [
  { key: "liste", label: "Liste" },
  { key: "table", label: "Table" },
  { key: "kanban", label: "Kanban" },
] as const;

export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; mine?: string }>;
}) {
  const { vue = "liste", mine } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canCreate = session!.user.permissions.includes(PERMISSIONS.PROJECT_CREATE);
  const scope = projectVisibilityWhere(session!.user.roleKey, session!.user.id);
  const onlyMine = mine === "1";
  const devise = await getOrganizationDevise();

  // Filtre "Mes projets" : responsable OU membre, combiné avec le scope des
  // rôles externes qui a déjà son propre filtre (déjà restreint aux projets
  // dont l'utilisateur est membre, donc redondant mais sans effet de bord).
  const andClauses: Prisma.ProjectWhereInput[] = [];
  if (scope) andClauses.push(scope);
  if (onlyMine) {
    andClauses.push({ OR: [{ responsableId: userId }, { members: { some: { userId } } }] });
  }
  // Isolation multi-entites (cahier des charges V2.2 §22) — voir entity-scope.ts.
  const entityScope = await getUserEntityScope(userId, session!.user.permissions);
  const allowedDepartmentIds = await getAllowedDepartmentIds(entityScope);
  if (allowedDepartmentIds) {
    andClauses.push({ departmentId: { in: allowedDepartmentIds } });
  }
  // Corbeille (V2.2 §37) : un projet supprime n'apparait plus dans la liste
  // (reste consultable via /corbeille et sa page de detail directe).
  andClauses.push({ deletedAt: null });
  const where: Prisma.ProjectWhereInput = { AND: andClauses };

  const [projects, departments, users, templates] = await Promise.all([
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
    canCreate
      ? prisma.projectTemplate.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, categorie: true } })
      : Promise.resolve([]),
  ]);

  const projectRows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    statut: p.statut,
    priorite: p.priorite,
    departmentNom: p.department.name,
    responsableNom: p.responsable.name,
    avancement: p.avancement,
    budget: p.budget ? Number(p.budget) : null,
    coutReel: p.coutReel ? Number(p.coutReel) : null,
    dateFin: p.dateFin ? p.dateFin.toISOString() : null,
  }));

  function withVue(key: string) {
    return `?vue=${key}${onlyMine ? "&mine=1" : ""}`;
  }

  const mineHref = `?vue=${vue}${onlyMine ? "" : "&mine=1"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Projets</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} projet(s){onlyMine ? " — les miens" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/projets/studio">
            <Button variant="outline" size="sm">
              <Sparkles className="mr-1 h-4 w-4" />
              Project Studio
            </Button>
          </Link>
          <Link href={mineHref}>
            <Button variant={onlyMine ? "default" : "outline"} size="sm">
              <User className="mr-1 h-4 w-4" />
              Mes projets
            </Button>
          </Link>
          <div className="flex flex-wrap rounded-md border">
            {VIEWS.map((v, i) => (
              <Link key={v.key} href={withVue(v.key)}>
                <Button
                  variant={vue === v.key ? "default" : "ghost"}
                  size="sm"
                  className={i === 0 ? "rounded-r-none" : i === VIEWS.length - 1 ? "rounded-l-none" : "rounded-none"}
                >
                  {v.label}
                </Button>
              </Link>
            ))}
          </div>
          <div className="flex rounded-md border">
            <Link href="/projets/portefeuille">
              <Button variant="ghost" size="sm" className="rounded-r-none">
                Portefeuille
              </Button>
            </Link>
            <Link href="/projets/idees">
              <Button variant="ghost" size="sm" className="rounded-none">
                Idées
              </Button>
            </Link>
            <Link href="/projets/roadmap">
              <Button variant="ghost" size="sm" className="rounded-none">
                Roadmap
              </Button>
            </Link>
            <Link href="/projets/calendrier">
              <Button variant="ghost" size="sm" className="rounded-none">
                Calendrier
              </Button>
            </Link>
            <Link href="/projets/carte">
              <Button variant="ghost" size="sm" className="rounded-none">
                Carte
              </Button>
            </Link>
            <Link href="/projets/control-tower">
              <Button variant="ghost" size="sm" className="rounded-none">
                Control Tower
              </Button>
            </Link>
            <Link href="/projets/modeles">
              <Button variant="ghost" size="sm" className="rounded-l-none">
                Modèles
              </Button>
            </Link>
          </div>
          {canCreate && (
            <ProjectFormDialog
              departments={departments.map((d) => ({ id: d.id, label: d.name }))}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
              templates={templates.map((t) => ({ id: t.id, label: `${t.nom} (${TEMPLATE_CATEGORY_LABELS[t.categorie]})` }))}
            />
          )}
        </div>
      </div>

      {vue === "table" && <ProjectTableView projects={projectRows} devise={devise} />}
      {vue === "kanban" && <ProjectKanbanView projects={projectRows} />}
      {vue === "liste" && (
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
      )}
    </div>
  );
}
