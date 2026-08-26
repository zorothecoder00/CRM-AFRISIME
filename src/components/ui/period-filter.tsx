"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Filtre année/mois réutilisable — s'applique au champ date passé côté serveur (voir buildDateRangeFilter). */
export function PeriodFilter({ dateLabel = "Échéance" }: { dateLabel?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const annee = searchParams.get("annee") ?? "";
  const mois = searchParams.get("mois") ?? "";

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  function update(key: "annee" | "mois", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "annee" && !value) params.delete("mois");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
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
        disabled={!annee}
        className="h-8 rounded-md border bg-background px-2 text-xs disabled:opacity-50"
        aria-label="Filtrer par mois"
      >
        <option value="">Tous mois</option>
        {MONTHS.map((label, i) => (
          <option key={i + 1} value={i + 1}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
