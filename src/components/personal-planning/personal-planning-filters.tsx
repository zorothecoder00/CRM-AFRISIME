"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { ChevronDown } from "lucide-react";

const STATUT_FILTER_OPTIONS: PersonalPlanningEntryStatut[] = ["EN_ATTENTE", "BLOQUEE"];

function DropdownCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="ml-0.5 text-[10px]">
      {count}
    </Badge>
  );
}

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
 *
 * Présentation en listes déroulantes (plutôt que des rangées de badges
 * toujours visibles) pour tenir sur une seule ligne compacte — demande
 * utilisateur, le bloc filtres prenait trop de place à l'écran.
 */
export function PersonalPlanningFilters({
  vue,
  semaine,
  activePriorites,
  activeStatuts,
  activeTypes,
  enRetard,
  aVenir,
  projects,
  activeProjetId,
}: {
  vue: string;
  semaine?: string;
  activePriorites: PersonalPlanningPriorite[];
  activeStatuts: PersonalPlanningEntryStatut[];
  activeTypes: PersonalPlanningEntryType[];
  enRetard: boolean;
  aVenir: boolean;
  projects: { id: string; nom: string }[];
  activeProjetId?: string;
}) {
  const router = useRouter();

  function buildHref(overrides: {
    priorites?: PersonalPlanningPriorite[];
    statuts?: PersonalPlanningEntryStatut[];
    types?: PersonalPlanningEntryType[];
    enRetard?: boolean;
    aVenir?: boolean;
    projetId?: string;
    vue?: string;
    semaine?: string;
  }) {
    const priorites = overrides.priorites ?? activePriorites;
    const statuts = overrides.statuts ?? activeStatuts;
    const types = overrides.types ?? activeTypes;
    const retard = overrides.enRetard ?? enRetard;
    const venir = overrides.aVenir ?? aVenir;
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
    if (venir) params.set("aVenir", "1");
    if (projetId) params.set("projetId", projetId);
    return `/planning-personnel?${params.toString()}`;
  }

  function go(overrides: Parameters<typeof buildHref>[0]) {
    router.push(buildHref(overrides));
  }

  const today = new Date();
  const periodLinks = [
    { label: "Aujourd'hui", href: buildHref({ vue: "jour", semaine: format(today, "yyyy-MM-dd") }) },
    { label: "Demain", href: buildHref({ vue: "jour", semaine: format(addDays(today, 1), "yyyy-MM-dd") }) },
    { label: "Cette semaine", href: buildHref({ vue: "semaine", semaine: undefined }) },
    { label: "Ce mois", href: buildHref({ vue: "mois", semaine: undefined }) },
  ];

  const prioriteCount = activePriorites.length < ENTRY_PRIORITE_ORDER.length ? activePriorites.length : 0;
  const typeCount = activeTypes.length < ENTRY_TYPE_OPTIONS.length ? activeTypes.length : 0;
  const statutCount = activeStatuts.length + (enRetard ? 1 : 0) + (aVenir ? 1 : 0);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Priorité
              <DropdownCount count={prioriteCount} />
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ENTRY_PRIORITE_ORDER.map((p) => {
              const isActive = activePriorites.includes(p);
              return (
                <DropdownMenuCheckboxItem
                  key={p}
                  checked={isActive}
                  onSelect={(e) => {
                    e.preventDefault();
                    const next = isActive ? activePriorites.filter((a) => a !== p) : [...activePriorites, p];
                    go({ priorites: next.length === 0 ? ENTRY_PRIORITE_ORDER : next });
                  }}
                >
                  {ENTRY_PRIORITE_META[p].emoji} {ENTRY_PRIORITE_META[p].label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Type
              <DropdownCount count={typeCount} />
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ENTRY_TYPE_OPTIONS.map((t) => {
              const isActive = activeTypes.includes(t);
              return (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={isActive}
                  onSelect={(e) => {
                    e.preventDefault();
                    const next = isActive ? activeTypes.filter((a) => a !== t) : [...activeTypes, t];
                    go({ types: next.length === 0 ? ENTRY_TYPE_OPTIONS : next });
                  }}
                >
                  {ENTRY_TYPE_META[t].label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Statut
              <DropdownCount count={statutCount} />
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUT_FILTER_OPTIONS.map((s) => {
              const isActive = activeStatuts.includes(s);
              return (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={isActive}
                  onSelect={(e) => {
                    e.preventDefault();
                    const next = isActive ? activeStatuts.filter((a) => a !== s) : [...activeStatuts, s];
                    go({ statuts: next });
                  }}
                >
                  {ENTRY_STATUT_LABELS[s]}
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={enRetard}
              onSelect={(e) => {
                e.preventDefault();
                go({ enRetard: !enRetard, aVenir: false });
              }}
            >
              En retard
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={aVenir}
              onSelect={(e) => {
                e.preventDefault();
                go({ aVenir: !aVenir, enRetard: false });
              }}
            >
              À venir
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {projects.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Projet
                <DropdownCount count={activeProjetId ? 1 : 0} />
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => go({ projetId: "" })}>
                Tous les projets
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {projects.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => go({ projetId: p.id })}>
                  {activeProjetId === p.id ? "✓ " : ""}
                  {p.nom}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
