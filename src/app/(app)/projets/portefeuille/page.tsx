import type { ReactNode } from "react";
import Link from "next/link";
import { withFrom } from "@/components/ui/contextual-back-link";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { getUserEntityScope, getAllowedDepartmentIds } from "@/lib/entity-scope";
import { getOrganizationDevise } from "@/lib/currency";
import { convertMontant } from "@/lib/exchange-rates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toneForStatus, toneForPriority, accentForStatus } from "@/lib/status-tone";
import type { Prisma } from "@/generated/prisma/client";
import { FolderKanban, Sparkles, Lightbulb, HandCoins, ChevronRight, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { materialTone } from "@/lib/card-tones";

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
  // URL courante (filtres compris) transmise aux blocs d'acces via ?from= :
  // leur lien de retour ramene ici avec les memes filtres.
  const filterQuery = new URLSearchParams(
    Object.entries(filters).filter(
      (e): e is [string, string] => e[0] !== "from" && typeof e[1] === "string" && e[1] !== "",
    ),
  ).toString();
  const currentUrl = `/projets/portefeuille${filterQuery ? `?${filterQuery}` : ""}`;
  const session = await getAppSession();
  const scope = projectVisibilityWhere(session!.user.roleKey, session!.user.id);
  const devise = await getOrganizationDevise();

  const andClauses: Prisma.ProjectWhereInput[] = [{ deletedAt: null }];
  if (scope) andClauses.push(scope);
  const entityScope = await getUserEntityScope(session!.user.id, session!.user.permissions);
  const allowedDepartmentIds = await getAllowedDepartmentIds(entityScope);
  if (allowedDepartmentIds) {
    andClauses.push({ departmentId: { in: allowedDepartmentIds } });
  }

  const [projects, departments, entities, users, programmes, paysList, bailleurList] = await Promise.all([
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
    prisma.entity.findMany({ select: { id: true, devise: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.programme.findMany({ orderBy: { nom: "asc" } }),
    prisma.project.findMany({ where: { pays: { not: null } }, select: { pays: true }, distinct: ["pays"] }),
    prisma.financement.findMany({ select: { bailleur: true }, distinct: ["bailleur"] }),
  ]);
  const paysOptions = paysList.map((p) => p.pays).filter((v): v is string => v !== null);

  // Revue applicative — ce portefeuille regroupe des projets de plusieurs
  // entites/pays potentiellement en devises differentes (voir Entity.devise) :
  // sommer les montants bruts sans convertir juxtaposerait des nombres dans
  // des devises differentes sous une seule etiquette, trompeur (meme
  // probleme/solution que computeScopePilotage et computeEntityBudgetRollup).
  const departmentEntityId = new Map(departments.map((d) => [d.id, d.entityId]));
  const entityDevise = new Map(entities.map((e) => [e.id, e.devise]));
  function deviseForDepartment(departmentId: string): string {
    const entityId = departmentEntityId.get(departmentId);
    return (entityId ? entityDevise.get(entityId) : null) || devise;
  }

  const conversionState = { incomplete: false };
  async function toOrgDevise(amount: number, fromDevise: string): Promise<number> {
    const { value, converted } = await convertMontant(amount, fromDevise, devise);
    if (!converted && fromDevise !== devise) conversionState.incomplete = true;
    return value;
  }

  const enriched = await Promise.all(
    projects.map(async (p) => {
      const niveauRisque = computeNiveauRisque(p.risks);
      const enRetard = !!p.dateFin && p.dateFin < new Date() && p.statut !== "TERMINE" && p.statut !== "ANNULE";
      const projectDevise = deviseForDepartment(p.departmentId);
      const budgetConverted = p.budget !== null ? await toOrgDevise(Number(p.budget), projectDevise) : 0;
      const coutReelConverted = p.coutReel !== null ? await toOrgDevise(Number(p.coutReel), projectDevise) : 0;
      const financementObtenu = (
        await Promise.all(
          p.financements.filter((f) => f.statut === "OBTENU").map((f) => toOrgDevise(Number(f.montant), projectDevise))
        )
      ).reduce((sum, v) => sum + v, 0);
      const financementRecherche = (
        await Promise.all(
          p.financements
            .filter((f) => f.statut === "RECHERCHE" || f.statut === "NEGOCIATION")
            .map((f) => toOrgDevise(Number(f.montant), projectDevise))
        )
      ).reduce((sum, v) => sum + v, 0);
      const bailleurs = p.financements.map((f) => f.bailleur);
      return { ...p, niveauRisque, enRetard, budgetConverted, coutReelConverted, financementObtenu, financementRecherche, bailleurs };
    })
  );

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
    budgetTotal: filtered.reduce((sum, p) => sum + p.budgetConverted, 0),
    budgetConsomme: filtered.reduce((sum, p) => sum + p.coutReelConverted, 0),
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
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble de {filtered.length} projet(s).</p>
      </div>

      {/* Demande utilisateur — point d'entree unique regroupant Projets,
          Project Studio, Laboratoire d'idees et Appel a projets (retires de
          la sidebar). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PortfolioBlockLink
          href={withFrom("/projets", currentUrl)}
          icon={FolderKanban}
          title="Projets"
          description="Liste détaillée, filtres et vues (kanban, gantt...)."
        />
        <PortfolioBlockLink
          href={withFrom("/projets/studio", currentUrl)}
          icon={Sparkles}
          title="Project Studio"
          description="Cadrage assisté d'un nouveau projet."
        />
        <PortfolioBlockLink
          href={withFrom("/projets/idees", currentUrl)}
          icon={Lightbulb}
          title="Laboratoire d'idées"
          description="Idées et opportunités à instruire."
        />
        <PortfolioBlockLink
          href={withFrom("/projets/appels-a-projets", currentUrl)}
          icon={HandCoins}
          title="Appel à projets"
          description="Candidatures et opportunités de financement."
        />
      </div>

      {/* Demande utilisateur — separe visuellement le bloc de liens
          (Projets/Project Studio/Laboratoire d'idees/Appel a projets) du
          reste des statistiques du portefeuille. */}
      <Separator />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Kpi index={0} label="Actifs" value={kpi.actifs} />
        <Kpi index={1} label="En préparation" value={kpi.enPreparation} />
        <Kpi index={2} label="Suspendus" value={kpi.suspendus} />
        <Kpi index={3} label="Terminés" value={kpi.termines} />
        <Kpi index={4} label="En retard" value={kpi.enRetard} tone={kpi.enRetard > 0 ? "destructive" : undefined} />
        <Kpi index={5} label="À risque" value={kpi.aRisque} tone={kpi.aRisque > 0 ? "destructive" : undefined} />
        <Kpi index={6} label="Budget total" value={`${kpi.budgetTotal.toLocaleString("fr-FR")} ${devise}`} />
        <Kpi index={7} label="Budget consommé" value={`${kpi.budgetConsomme.toLocaleString("fr-FR")} ${devise}`} />
        <Kpi index={8} label="Financement obtenu" value={`${kpi.financementObtenu.toLocaleString("fr-FR")} ${devise}`} />
        <Kpi index={9} label="Financement recherché" value={`${kpi.financementRecherche.toLocaleString("fr-FR")} ${devise}`} />
        <Kpi index={10} label="Avancement moyen" value={`${kpi.avancementMoyen}%`} />
        <Kpi index={11} label="Impact suivi (indicateurs)" value={kpi.avecIndicateurs} />
      </div>

      {conversionState.incomplete && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Un ou plusieurs projets sont dans une devise sans taux de change configuré vers {devise} — les totaux
            budget/financement ci-dessus additionnent leur montant brut non converti et sont donc probablement
            inexacts. Renseignez le taux manquant dans{" "}
            <Link href="/administration/devises" className="underline">
              Administration → Devises
            </Link>
            .
          </p>
        </div>
      )}

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
        {filtered.map((project, i) => (
          <Link key={project.id} href={`/projets/${project.id}`}>
            <Card accent={accentForStatus(project.statut)} className={cn("h-full transition-all hover:-translate-y-0.5 hover:brightness-95", materialTone(i))}>
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

function PortfolioBlockLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    // Demande utilisateur — ces blocs ressemblaient a du texte simple : bordure
    // gauche coloree + fleche persistante (pas seulement au survol) pour que
    // l'affordance "c'est cliquable" soit visible d'emblee, comme les autres
    // cartes-lien de l'appli (voir accentForStatus/toneForStatus ailleurs).
    // Demande utilisateur — fond rouge bordeaux (red-800), texte blanc.
    <Link href={href} className="group block">
      <Card
        className="h-full bg-red-800 text-white transition-all hover:-translate-y-0.5 hover:bg-red-700"
      >
        <CardContent className="flex items-center gap-3 px-(--card-spacing)">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/15 text-white">
            <Icon className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-sm font-semibold text-white underline decoration-white/40 underline-offset-2 group-hover:decoration-white">
              {title}
            </div>
            <p className="text-xs text-white/75">{description}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
        </CardContent>
      </Card>
    </Link>
  );
}

function Kpi({
  index,
  label,
  value,
  tone,
}: {
  index: number;
  label: string;
  value: string | number;
  tone?: "destructive";
}) {
  // Demande utilisateur — blocs de stats colores (rotation Material, voir
  // lib/card-tones.ts) ; l'accent de statut garde sa barre de tete.
  return (
    <Card size="sm" accent={tone} className={materialTone(index)}>
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
