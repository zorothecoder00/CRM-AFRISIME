"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ProjectStudioItem = { value: string; label: string; content: ReactNode };
export type ProjectStudioCategory = { nom: string; items: ProjectStudioItem[] };

/**
 * Regroupe les onglets créés spécifiquement pour le cahier des charges
 * Project Studio (WBS, ToC, cadre logique, budget, risques enrichis...) sous
 * un seul onglet "Project Studio" plutôt que de les laisser noyés dans la
 * cinquantaine d'onglets à plat de la page projet — c'était l'objectif
 * initial ("les gens n'arrivent pas à voir les nouveautés") : déplacer les
 * vraies UI, pas juste les lister ailleurs.
 */
export function ProjectStudioPanel({
  categories,
  defaultValue,
}: {
  categories: ProjectStudioCategory[];
  defaultValue: string;
}) {
  const [active, setActive] = useState(defaultValue);
  const current = categories.flatMap((c) => c.items).find((i) => i.value === active) ?? categories[0]?.items[0];

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        {categories.map((cat) => (
          <div key={cat.nom} className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">{cat.nom}</div>
            <div className="flex flex-wrap gap-1.5">
              {cat.items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActive(item.value)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    active === item.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {current?.content}
    </div>
  );
}
