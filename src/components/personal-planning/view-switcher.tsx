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

/** Sous-ensemble utilisé par /planning-personnel/agenda (demande utilisateur — vue jour par défaut, calendrier semaine/mois). */
export const AGENDA_CALENDAR_VIEWS = [
  { key: "jour", label: "Jour" },
  { key: "semaine", label: "Semaine" },
  { key: "mois", label: "Mois" },
] as const;

/** Sélecteur des 6 vues du module (§8), mémorisé dans l'URL (?vue=). */
export function PersonalPlanningViewSwitcher({
  activeVue,
  semaine,
  basePath = "/planning-personnel",
  views = VIEWS,
}: {
  activeVue: string;
  semaine?: string;
  /** Demande utilisateur — /planning-personnel/agenda réutilise ce switcher
   * mais pointe vers sa propre page (pas le hub), avec un sous-ensemble de
   * vues (jour/semaine/mois uniquement, voir `views`). */
  basePath?: string;
  views?: readonly { key: string; label: string }[];
}) {
  function hrefFor(key: string) {
    return `${basePath}?vue=${key}${semaine ? `&semaine=${semaine}` : ""}`;
  }

  return (
    <div className="flex flex-wrap rounded-md border">
      {views.map((v, i) => (
        <Link key={v.key} href={hrefFor(v.key)}>
          <Button
            variant={activeVue === v.key ? "default" : "ghost"}
            size="sm"
            className={i === 0 ? "rounded-r-none" : i === views.length - 1 ? "rounded-l-none" : "rounded-none"}
          >
            {v.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
