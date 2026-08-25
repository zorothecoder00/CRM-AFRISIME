import type { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { getOrganizationDevise } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority, accentForStatus } from "@/lib/status-tone";
import type { Prisma } from "@/generated/prisma/client";

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

const RISK_LEVEL_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

type SearchParams = {
  departmentId?: string;
  responsableId?: string;
  programmeId?: string;
  pays?: string;
  bailleur?: string;
  priorite?: string;
  statut?: string;
  budgetMin?: string;
  niveauRisque?: string;
};

function computeNiveauRisque(risks: { probabilite: string; impact: string; statut: string }[]): "FAIBLE" | "MOYEN" | "ELEVE" {
  const actifs = risks.filter((r) => r.statut !== "CLOS" && r.statut !== "MAITRISE");
  if (actifs.some((r) => r.impact === "ELEVE" && r.probabilite === "ELEVEE")) return "ELEVE";
  if (actifs.some((r) => r.impact !== "FAIBLE" || r.probabilite !== "FAIBLE")) return "MOYEN";
  return "FAIBLE";
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  const session = await getServerSession(authOptions);
  const scope = projectVisibilityWhere(session!.user.roleKey, session!.user.id);
  const devise = await getOrganizationDevise();

  const andClauses: Prisma.ProjectWhereInput[] = [{ deletedAt: null }];
  if (scope) andClauses.push(scope);
  const entityScope = await getUserEntityScope(session!.user.id, session!.user.permissions);
  const allowedDepartmentIds = await getAllowedDepartmentIds(entityScope);
  if (allowedDepartmentIds) {
    andClauses.push({ departmentId: { in: allowedDepartmentIds } });
  }

  const [projects, departments, users, programmes, paysList, bailleurList] = await Promise.all([
    prisma.project.findMany({
      where: { AND: andClauses },
      include: {
        department: true,
        responsable: true,
        programme: true,
        risks: { select: { probabilite: true, impact: true, statut: true } },
        financements: { select: { statut: true, montant: true, bailleur: true } },
        _count: { select: { indicators: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.programme.findMany({ orderBy: { nom: "asc" } }),
    prisma.project.findMany({ where: { pays: { not: null } }, select: { pays: true }, distinct: ["pays"] }),
    prisma.financement.findMany({ select: { bailleur: true }, distinct: ["bailleur"] }),
  ]);
  const paysOptions = paysList.map((p) => p.pays).filter((v): v is string => v !== null);

  const enriched = projects.map((p) => {
    const niveauRisque = computeNiveauRisque(p.risks);
    const enRetard = !!p.dateFin && p.dateFin < new Date() && p.statut !== "TERMINE" && p.statut !== "ANNULE";
    const financementObtenu = p.financements
      .filter((f) => f.statut === "OBTENU")
      .reduce((sum, f) => sum + Number(f.montant), 0);
    const financementRecherche = p.financements
      .filter((f) => f.statut === "RECHERCHE" || f.statut === "NEGOCIATION")
      .reduce((sum, f) => sum + Number(f.montant), 0);
    const bailleurs = p.financements.map((f) => f.bailleur);
    return { ...p, niveauRisque, enRetard, financementObtenu, financementRecherche, bailleurs };
  });

  const filtered = enriched.filter((p) => {
    if (filters.departmentId && p.departmentId !== filters.departmentId) return false;
    if (filters.responsableId && p.responsableId !== filters.responsableId) return false;
    if (filters.programmeId && p.programmeId !== filters.programmeId) return false;
    if (filters.pays && p.pays !== filters.pays) return false;
    if (filters.bailleur && !p.bailleurs.includes(filters.bailleur)) return false;
    if (filters.priorite && p.priorite !== filters.priorite) return false;
    if (filters.statut && p.statut !== filters.statut) return false;
    if (filters.niveauRisque && p.niveauRisque !== filters.niveauRisque) return false;
    if (filters.budgetMin && (!p.budget || Number(p.budget) < Number(filters.budgetMin))) return false;
    return true;
  });

  const kpi = {
    actifs: filtered.filter((p) => p.statut === "EN_COURS").length,
    enPreparation: filtered.filter((p) => p.statut === "PLANIFIE").length,
    suspendus: filtered.filter((p) => p.statut === "EN_PAUSE").length,
    termines: filtered.filter((p) => p.statut === "TERMINE").length,
    enRetard: filtered.filter((p) => p.enRetard).length,
    aRisque: filtered.filter((p) => p.niveauRisque === "ELEVE").length,
    budgetTotal: filtered.reduce((sum, p) => sum + (p.budget ? Number(p.budget) : 0), 0),
    budgetConsomme: filtered.reduce((sum, p) => sum + (p.coutReel ? Number(p.coutReel) : 0), 0),
    financementObtenu: filtered.reduce((sum, p) => sum + p.financementObtenu, 0),
    financementRecherche: filtered.reduce((sum, p) => sum + p.financementRecherche, 0),
    avancementMoyen: filtered.length
      ? Math.round(filtered.reduce((sum, p) => sum + p.avancement, 0) / filtered.length)
      : 0,
    avecIndicateurs: filtered.filter((p) => p._count.indicators > 0).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portefeuille de projets</h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de {filtered.length} projet(s) — voir aussi{" "}
          <Link href="/projets" className="text-primary hover:underline">
            la liste détaillée
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Kpi label="Actifs" value={kpi.actifs} />
        <Kpi label="En préparation" value={kpi.enPreparation} />
        <Kpi label="Suspendus" value={kpi.suspendus} />
        <Kpi label="Terminés" value={kpi.termines} />
        <Kpi label="En retard" value={kpi.enRetard} tone={kpi.enRetard > 0 ? "destructive" : undefined} />
        <Kpi label="À risque" value={kpi.aRisque} tone={kpi.aRisque > 0 ? "destructive" : undefined} />
        <Kpi label="Budget total" value={`${kpi.budgetTotal.toLocaleString("fr-FR")} ${devise}`} />
        <Kpi label="Budget consommé" value={`${kpi.budgetConsomme.toLocaleString("fr-FR")} ${devise}`} />
        <Kpi label="Financement obtenu" value={`${kpi.financementObtenu.toLocaleString("fr-FR")} ${devise}`} tone="success" />
        <Kpi label="Financement recherché" value={`${kpi.financementRecherche.toLocaleString("fr-FR")} ${devise}`} />
        <Kpi label="Avancement moyen" value={`${kpi.avancementMoyen}%`} />
        <Kpi label="Impact suivi (indicateurs)" value={kpi.avecIndicateurs} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" action="/projets/portefeuille">
            <FilterSelect name="departmentId" label="Département" defaultValue={filters.departmentId}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="responsableId" label="Responsable" defaultValue={filters.responsableId}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="programmeId" label="Programme" defaultValue={filters.programmeId}>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="pays" label="Pays" defaultValue={filters.pays}>
              {paysOptions.map((pays) => (
                <option key={pays} value={pays}>
                  {pays}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="bailleur" label="Bailleur" defaultValue={filters.bailleur}>
              {bailleurList.map((b) => (
                <option key={b.bailleur} value={b.bailleur}>
                  {b.bailleur}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="priorite" label="Priorité" defaultValue={filters.priorite}>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="statut" label="Statut" defaultValue={filters.statut}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="niveauRisque" label="Niveau de risque" defaultValue={filters.niveauRisque}>
              {Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Budget minimum</span>
              <input
                type="number"
                name="budgetMin"
                defaultValue={filters.budgetMin}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">
                Filtrer
              </button>
              <Link href="/projets/portefeuille" className="h-9 rounded-md border px-4 text-sm leading-9">
                Réinitialiser
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <Link key={project.id} href={`/projets/${project.id}`}>
            <Card accent={accentForStatus(project.statut)} className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{project.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toneForStatus(project.statut)}>{STATUS_LABELS[project.statut]}</Badge>
                  <Badge variant={toneForPriority(project.priorite)}>{PRIORITY_LABELS[project.priorite]}</Badge>
                  {project.enRetard && <Badge variant="destructive">En retard</Badge>}
                  {project.niveauRisque === "ELEVE" && <Badge variant="destructive">Risque élevé</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">Responsable : {project.responsable.name}</div>
                {project.pays && <div className="text-xs text-muted-foreground">Pays : {project.pays}</div>}
                <div className="text-xs font-medium">Avancement : {project.avancement}%</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet ne correspond à ces filtres.</p>}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: "destructive" | "success" }) {
  return (
    <Card size="sm" accent={tone}>
      <CardContent className="px-(--card-spacing)">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
        <option value="">Tous</option>
        {children}
      </select>
    </label>
  );
}
