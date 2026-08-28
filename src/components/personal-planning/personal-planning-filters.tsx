import Link from "next/link";
import { format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  ENTRY_PRIORITE_ORDER,
  ENTRY_PRIORITE_META,
  ENTRY_STATUT_LABELS,
  ENTRY_TYPE_OPTIONS,
  ENTRY_TYPE_META,
  type PersonalPlanningPriorite,
  type PersonalPlanningEntryStatut,
  type PersonalPlanningEntryType,
} from "@/lib/personal-planning-types";
import { cn } from "@/lib/utils";

const STATUT_FILTER_OPTIONS: PersonalPlanningEntryStatut[] = ["EN_ATTENTE", "BLOQUEE"];

/**
 * §32 : filtres du planning — priorité (§11, déjà en place), statut
 * (En attente/Bloqué), type d'activité, en retard, et raccourcis de
 * période (Aujourd'hui/Demain/Cette semaine/Ce mois). "Département" et
 * "Responsable" du document ne sont pas repris ici : cette page est scopée
 * à l'utilisateur connecté par conception (§46), ces deux dimensions n'ont
 * de sens que sur les dashboards manager/direction (§37/§38), pas dans un
 * planning personnel. Un seul composant pour que les liens de chaque
 * filtre préservent toujours les autres dimensions actives (au lieu de se
 * marcher dessus si chacun construisait son propre href indépendamment).
 */
export function PersonalPlanningFilters({
  vue,
  semaine,
  activePriorites,
  activeStatuts,
  activeTypes,
  enRetard,
  projects,
  activeProjetId,
}: {
  vue: string;
  semaine?: string;
  activePriorites: PersonalPlanningPriorite[];
  activeStatuts: PersonalPlanningEntryStatut[];
  activeTypes: PersonalPlanningEntryType[];
  enRetard: boolean;
  projects: { id: string; nom: string }[];
  activeProjetId?: string;
}) {
  function buildHref(overrides: {
    priorites?: PersonalPlanningPriorite[];
    statuts?: PersonalPlanningEntryStatut[];
    types?: PersonalPlanningEntryType[];
    enRetard?: boolean;
    projetId?: string;
    vue?: string;
    semaine?: string;
  }) {
    const priorites = overrides.priorites ?? activePriorites;
    const statuts = overrides.statuts ?? activeStatuts;
    const types = overrides.types ?? activeTypes;
    const retard = overrides.enRetard ?? enRetard;
    const projetId = overrides.projetId !== undefined ? overrides.projetId : activeProjetId;
    const targetVue = overrides.vue ?? vue;
    const targetSemaine = overrides.semaine !== undefined ? overrides.semaine : semaine;

    const params = new URLSearchParams();
    params.set("vue", targetVue);
    if (targetSemaine) params.set("semaine", targetSemaine);
    if (priorites.length > 0 && priorites.length < ENTRY_PRIORITE_ORDER.length) params.set("priorite", priorites.join(","));
    if (statuts.length > 0) params.set("statut", statuts.join(","));
    if (types.length > 0 && types.length < ENTRY_TYPE_OPTIONS.length) params.set("type", types.join(","));
    if (retard) params.set("enRetard", "1");
    if (projetId) params.set("projetId", projetId);
    return `/planning-personnel?${params.toString()}`;
  }

  const today = new Date();
  const periodLinks = [
    { label: "Aujourd'hui", href: buildHref({ vue: "jour", semaine: format(today, "yyyy-MM-dd") }) },
    { label: "Demain", href: buildHref({ vue: "jour", semaine: format(addDays(today, 1), "yyyy-MM-dd") }) },
    { label: "Cette semaine", href: buildHref({ vue: "semaine", semaine: undefined }) },
    { label: "Ce mois", href: buildHref({ vue: "mois", semaine: undefined }) },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Aller à :</span>
        {periodLinks.map((p) => (
          <Link key={p.label} href={p.href}>
            <Badge variant="outline" className="cursor-pointer">
              {p.label}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Priorité :</span>
        {ENTRY_PRIORITE_ORDER.map((p) => {
          const isActive = activePriorites.includes(p);
          const next = isActive ? activePriorites.filter((a) => a !== p) : [...activePriorites, p];
          const target = next.length === 0 ? ENTRY_PRIORITE_ORDER : next;
          return (
            <Link key={p} href={buildHref({ priorites: target })}>
              <Badge variant={isActive ? "outline" : "secondary"} className={cn("cursor-pointer gap-1", !isActive && "opacity-50")}>
                {ENTRY_PRIORITE_META[p].emoji} {ENTRY_PRIORITE_META[p].label}
              </Badge>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Type :</span>
        {ENTRY_TYPE_OPTIONS.map((t) => {
          const isActive = activeTypes.includes(t);
          const next = isActive ? activeTypes.filter((a) => a !== t) : [...activeTypes, t];
          const target = next.length === 0 ? ENTRY_TYPE_OPTIONS : next;
          return (
            <Link key={t} href={buildHref({ types: target })}>
              <Badge variant={isActive ? "outline" : "secondary"} className={cn("cursor-pointer", !isActive && "opacity-50")}>
                {ENTRY_TYPE_META[t].label}
              </Badge>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Statut :</span>
        {STATUT_FILTER_OPTIONS.map((s) => {
          const isActive = activeStatuts.includes(s);
          const next = isActive ? activeStatuts.filter((a) => a !== s) : [...activeStatuts, s];
          return (
            <Link key={s} href={buildHref({ statuts: next })}>
              <Badge variant={isActive ? "outline" : "secondary"} className={cn("cursor-pointer", !isActive && "opacity-50")}>
                {ENTRY_STATUT_LABELS[s]}
              </Badge>
            </Link>
          );
        })}
        <Link href={buildHref({ enRetard: !enRetard })}>
          <Badge variant={enRetard ? "destructive" : "secondary"} className={cn("cursor-pointer", !enRetard && "opacity-50")}>
            En retard
          </Badge>
        </Link>
        {projects.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">Projet :</span>
            <Link href={buildHref({ projetId: "" })}>
              <Badge variant={!activeProjetId ? "outline" : "secondary"} className={cn("cursor-pointer", !!activeProjetId && "opacity-50")}>
                Tous
              </Badge>
            </Link>
            {projects.map((p) => (
              <Link key={p.id} href={buildHref({ projetId: p.id })}>
                <Badge variant={activeProjetId === p.id ? "outline" : "secondary"} className={cn("cursor-pointer", activeProjetId !== p.id && "opacity-50")}>
                  {p.nom}
                </Badge>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
