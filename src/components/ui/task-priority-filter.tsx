"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PRIORITY_OPTIONS = [
  { value: "TRES_HAUTE", label: "Très haute" },
  { value: "HAUTE", label: "Haute" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "BASSE", label: "Basse" },
];

/** Filtre par priorité réutilisable (paramètre `priorite`) — même pattern que ProjectFilter (préserve tous les autres paramètres via searchParams.toString()). */
export function TaskPriorityFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const priorite = searchParams.get("priorite") ?? "";

  function update(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("priorite", value);
    else params.delete("priorite");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={priorite}
      onChange={(e) => update(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
      aria-label="Filtrer par priorité"
    >
      <option value="">Toutes priorités</option>
      {PRIORITY_OPTIONS.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
