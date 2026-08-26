import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { getOrganizationDevise } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectTableView, type ProjectRow } from "@/components/projects/project-table-view";
import { ProjectKanbanView } from "@/components/projects/project-kanban-view";
import { ProjectListCard } from "@/components/projects/project-list-card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { buildDateRangeFilter } from "@/lib/date-filter";
import type { Prisma } from "@/generated/prisma/client";
import { User } from "lucide-react";

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
  searchParams: Promise<{ vue?: string; mine?: string; annee?: string; mois?: string }>;
}) {
  const { vue = "liste", mine, annee, mois } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canCreate = session!.user.permissions.includes(PERMISSIONS.PROJECT_CREATE);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);
  const canDelete = session!.user.permissions.includes(PERMISSIONS.PROJECT_DELETE);
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
  // Filtre annuel/mensuel — sur l'échéance (dateFin), déjà affichée en colonne.
  const dateRange = buildDateRangeFilter(annee, mois);
  if (dateRange) andClauses.push({ dateFin: dateRange });
  const where: Prisma.ProjectWhereInput = { AND: andClauses };

  const [projects, departments, users, templates] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { department: true, responsable: true },
      orderBy: { updatedAt: "desc" },
    }),
    canCreate || canManage
      ? prisma.department.findMany({ orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canCreate || canManage
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canCreate
      ? prisma.projectTemplate.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, categorie: true } })
      : Promise.resolve([]),
  ]);

  const projectRows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    nom: p.nom,
    description: p.description,
    objectif: p.objectif,
    statut: p.statut,
    priorite: p.priorite,
    departmentId: p.departmentId,
    departmentNom: p.department.name,
    responsableId: p.responsableId,
    responsableNom: p.responsable.name,
    avancement: p.avancement,
    budget: p.budget ? Number(p.budget) : null,
    coutReel: p.coutReel ? Number(p.coutReel) : null,
    dateDebut: p.dateDebut ? p.dateDebut.toISOString() : null,
    dateFin: p.dateFin ? p.dateFin.toISOString() : null,
    localisation: p.localisation,
  }));

  const departmentOptions = departments.map((d) => ({ id: d.id, label: d.name }));
  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));

  const periodQuery = `${annee ? `&annee=${annee}` : ""}${annee && mois ? `&mois=${mois}` : ""}`;

  function withVue(key: string) {
    return `?vue=${key}${onlyMine ? "&mine=1" : ""}${periodQuery}`;
  }

  const mineHref = `?vue=${vue}${onlyMine ? "" : "&mine=1"}${periodQuery}`;

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
          <PeriodFilter dateLabel="Échéance" />
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

      {vue === "table" && (
        <ProjectTableView
          projects={projectRows}
          devise={devise}
          departments={departmentOptions}
          users={userOptions}
          canManage={canManage}
          canDelete={canDelete}
        />
      )}
      {vue === "kanban" && (
        <ProjectKanbanView
          projects={projectRows}
          departments={departmentOptions}
          users={userOptions}
          canManage={canManage}
          canDelete={canDelete}
        />
      )}
      {vue === "liste" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectRows.map((project) => (
            <ProjectListCard
              key={project.id}
              project={project}
              departments={departmentOptions}
              users={userOptions}
              canManage={canManage}
              canDelete={canDelete}
            />
          ))}
          {projectRows.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun projet pour le moment.</p>
          )}
        </div>
      )}
    </div>
  );
}
