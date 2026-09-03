"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/**
 * Filtre année/mois réutilisable — s'applique au champ date passé côté
 * serveur (voir buildDateRangeFilter). `showWeekDay` (mes-taches uniquement,
 * demande utilisateur) ajoute deux modes alternatifs — Semaine/Jour — via un
 * simple date-picker chacun ; les 4 modes (année/mois, semaine, jour) sont
 * mutuellement exclusifs, choisir l'un efface les autres.
 */
export function PeriodFilter({ dateLabel = "Échéance", showWeekDay = false }: { dateLabel?: string; showWeekDay?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const annee = searchParams.get("annee") ?? "";
  const mois = searchParams.get("mois") ?? "";
  const semaine = searchParams.get("semaine") ?? "";
  const jour = searchParams.get("jour") ?? "";

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  function update(key: "annee" | "mois" | "semaine" | "jour", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    // Modes mutuellement exclusifs : passer à l'un efface les autres.
    params.delete("annee");
    params.delete("mois");
    params.delete("semaine");
    params.delete("jour");
    if (value) {
      if (key === "mois") {
        // Choisir un mois sans année déjà choisie donnait un filtre "mois"
        // silencieusement sans effet — on retombe sur l'année en cours.
        params.set("annee", annee || String(currentYear));
        params.set("mois", value);
      } else {
        params.set(key, value);
      }
    } else if (key === "annee") {
      // Vider l'année seule (l'utilisateur garde éventuellement le mois affiché).
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{dateLabel} :</span>
      <select
        value={annee}
        onChange={(e) => update("annee", e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label="Filtrer par année"
      >
        <option value="">Toutes années</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        value={mois}
        onChange={(e) => update("mois", e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label="Filtrer par mois"
      >
        <option value="">Tous mois</option>
        {MONTHS.map((label, i) => (
          <option key={i + 1} value={i + 1}>
            {label}
          </option>
        ))}
      </select>
      {showWeekDay && (
        <>
          <span className="text-xs text-muted-foreground">ou</span>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Semaine du
            <input
              type="date"
              value={semaine}
              onChange={(e) => update("semaine", e.target.value)}
              className="h-8 rounded-md border bg-background px-1.5 text-xs"
              aria-label="Filtrer par semaine"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Jour
            <input
              type="date"
              value={jour}
              onChange={(e) => update("jour", e.target.value)}
              className="h-8 rounded-md border bg-background px-1.5 text-xs"
              aria-label="Filtrer par jour"
            />
          </label>
        </>
      )}
    </div>
  );
}
