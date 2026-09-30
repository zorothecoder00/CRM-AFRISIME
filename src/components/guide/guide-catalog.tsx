"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GUIDE_ACCESS, GUIDE_GROUPS, GUIDE_MODULES, type GuideGroupKey } from "./guide-data";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Catalogue filtrable de tous les modules, dans l'ordre du menu. */
export function GuideCatalog() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GuideGroupKey | "all">("all");

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    return GUIDE_GROUPS.filter((g) => group === "all" || g.key === group)
      .map((g) => ({
        ...g,
        items: GUIDE_MODULES.filter((m) => m.group === g.key).filter(
          (m) => !q || normalize([m.name, m.href, m.description, ...m.actions].join(" ")).includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, group]);

  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <label htmlFor="guide-search" className="text-sm text-muted-foreground">
          Rechercher un module, un bouton, une notion
        </label>
        <Input
          id="guide-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex. congé, budget, validation, portail…"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par groupe">
          {[{ key: "all" as const, label: "Tout" }, ...GUIDE_GROUPS].map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={group === g.key}
              onClick={() => setGroup(g.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
                group === g.key && "border-sidebar bg-sidebar text-sidebar-foreground hover:bg-sidebar"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {total} module{total > 1 ? "s" : ""} affiché{total > 1 ? "s" : ""} sur {GUIDE_MODULES.length}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun module ne correspond à « {query} ».
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="space-y-3">
            <h3 className="flex flex-wrap items-baseline gap-2 text-lg font-semibold">
              {g.label}
              <span className="text-sm font-normal text-muted-foreground">
                {g.sub} · {g.items.length}
              </span>
            </h3>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {g.items.map((m) => {
                const access = GUIDE_ACCESS[m.access];
                return (
                  <article key={m.href + m.name} className="space-y-2 rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold">{m.name}</h4>
                        <Link href={m.href} className="break-all font-mono text-xs text-muted-foreground hover:text-primary hover:underline">
                          {m.href}
                        </Link>
                      </div>
                      <Badge variant={access.variant}>{access.label}</Badge>
                    </div>
                    {m.heuristic && (
                      <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Calcul automatique, sans modèle d&apos;IA</p>
                    )}
                    <p className="text-sm">{m.description}</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                      {m.actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
