import Link from "next/link";
import { Button } from "@/components/ui/button";

const VIEWS = [
  { key: "semaine", label: "Semaine" },
  { key: "jour", label: "Jour" },
  { key: "mois", label: "Mois" },
  { key: "agenda", label: "Agenda" },
  { key: "liste", label: "Liste" },
  { key: "timeline", label: "Timeline" },
] as const;

/** Sélecteur des 6 vues du module (§8), mémorisé dans l'URL (?vue=). */
export function PersonalPlanningViewSwitcher({ activeVue, semaine }: { activeVue: string; semaine?: string }) {
  function hrefFor(key: string) {
    return `/planning-personnel?vue=${key}${semaine ? `&semaine=${semaine}` : ""}`;
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
