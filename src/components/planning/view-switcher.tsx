import Link from "next/link";
import { Button } from "@/components/ui/button";

const VIEWS = [
  { key: "semaine", label: "Semaine" },
  { key: "jour", label: "Jour" },
  { key: "liste", label: "Liste" },
] as const;

/** Sélecteur de vues pour /planning (retour utilisateur — "l'onglet agenda
 * est trop standard") — même principe que PersonalPlanningViewSwitcher,
 * réduit aux 3 vues pertinentes pour un planning en lecture seule. */
export function PlanningViewSwitcher({ activeVue, semaine }: { activeVue: string; semaine?: string }) {
  function hrefFor(key: string) {
    return `/planning?vue=${key}${semaine ? `&semaine=${semaine}` : ""}`;
  }

  return (
    <div className="flex flex-wrap rounded-md border">
      {VIEWS.map((v, i) => (
        <Link key={v.key} href={hrefFor(v.key)}>
          <Button
            variant={activeVue === v.key ? "default" : "ghost"}
            size="sm"
            className={i === 0 ? "rounded-r-none" : i === VIEWS.length - 1 ? "rounded-l-none" : "rounded-none"}
          >
            {v.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
