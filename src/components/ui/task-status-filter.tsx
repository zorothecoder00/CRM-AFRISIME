"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "A_FAIRE", label: "À faire" },
  { value: "EN_COURS", label: "En cours" },
  { value: "EN_REVISION", label: "En révision" },
  { value: "BLOQUEE", label: "Bloquée" },
  { value: "TERMINEE", label: "Terminée" },
  { value: "ANNULEE", label: "Annulée" },
  { value: "REPORTEE", label: "Reportée" },
];

/** Filtre par statut réutilisable (paramètre `statut`) — même pattern que ProjectFilter (préserve tous les autres paramètres via searchParams.toString()). */
export function TaskStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statut = searchParams.get("statut") ?? "";

  function update(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("statut", value);
    else params.delete("statut");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={statut}
      onChange={(e) => update(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
      aria-label="Filtrer par statut"
    >
      <option value="">Tous statuts</option>
      {STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
