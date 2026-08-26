"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Option = { id: string; label: string };

/**
 * Filtre par projet réutilisable (paramètre `projetId`) — la vue "Tableau
 * blanc" des tâches (entre autres) ne s'ouvre qu'une fois un projet choisi,
 * mais aucun contrôle ne permettait jusqu'ici de le faire depuis /taches.
 */
export function ProjectFilter({ projects }: { projects: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const projetId = searchParams.get("projetId") ?? "";

  function update(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("projetId", value);
    else params.delete("projetId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={projetId}
      onChange={(e) => update(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
      aria-label="Filtrer par projet"
    >
      <option value="">Tous les projets</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
