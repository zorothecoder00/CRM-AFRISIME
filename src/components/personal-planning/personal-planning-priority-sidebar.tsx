import Link from "next/link";
import {
  ENTRY_PRIORITE_ORDER,
  ENTRY_PRIORITE_META,
  ENTRY_TYPE_OPTIONS,
  type PersonalPlanningPriorite,
  type PersonalPlanningEntryStatut,
  type PersonalPlanningEntryType,
} from "@/lib/personal-planning-types";
import { cn } from "@/lib/utils";

/**
 * Filtre priorité, vertical et toujours visible à côté du calendrier —
 * essai de mise en page plus légère (moins de lignes de badges d'un coup)
 * que l'ancienne barre de filtres horizontale, à l'entrée du calendrier
 * plutôt qu'au-dessus. Les autres filtres (type/statut/projet/période)
 * restent disponibles via "Plus de filtres" (voir page.tsx), inchangés.
 */
export function PersonalPlanningPrioritySidebar({
  vue,
  semaine,
  activePriorites,
  activeStatuts,
  activeTypes,
  enRetard,
  aVenir,
  activeProjetId,
}: {
  vue: string;
  semaine?: string;
  activePriorites: PersonalPlanningPriorite[];
  activeStatuts: PersonalPlanningEntryStatut[];
  activeTypes: PersonalPlanningEntryType[];
  enRetard: boolean;
  aVenir: boolean;
  activeProjetId?: string;
}) {
  function buildHref(priorites: PersonalPlanningPriorite[]) {
    const params = new URLSearchParams();
    params.set("vue", vue);
    if (semaine) params.set("semaine", semaine);
    if (priorites.length > 0 && priorites.length < ENTRY_PRIORITE_ORDER.length) params.set("priorite", priorites.join(","));
    if (activeStatuts.length > 0) params.set("statut", activeStatuts.join(","));
    if (activeTypes.length > 0 && activeTypes.length < ENTRY_TYPE_OPTIONS.length) params.set("type", activeTypes.join(","));
    if (enRetard) params.set("enRetard", "1");
    if (aVenir) params.set("aVenir", "1");
    if (activeProjetId) params.set("projetId", activeProjetId);
    return `/planning-personnel?${params.toString()}`;
  }

  return (
    <div className="h-fit space-y-1 rounded-md border p-3">
      <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Priorité</p>
      {ENTRY_PRIORITE_ORDER.map((p) => {
        const isActive = activePriorites.includes(p);
        const next = isActive ? activePriorites.filter((a) => a !== p) : [...activePriorites, p];
        const target = next.length === 0 ? ENTRY_PRIORITE_ORDER : next;
        return (
          <Link key={p} href={buildHref(target)} className="block">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded px-1.5 py-1 text-xs whitespace-nowrap hover:bg-muted",
                !isActive && "opacity-40"
              )}
            >
              {ENTRY_PRIORITE_META[p].emoji} {ENTRY_PRIORITE_META[p].label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
