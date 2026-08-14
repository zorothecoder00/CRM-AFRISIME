"use client";

import Link from "next/link";
import { setDefaultTaskView } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";

const VIEWS = [
  { key: "liste", label: "Liste" },
  { key: "kanban", label: "Kanban" },
  { key: "chronologie", label: "Chronologie" },
  { key: "gantt", label: "Gantt" },
  { key: "mindmap", label: "Mind Map" },
  { key: "portefeuille", label: "Portefeuille" },
  { key: "blanc", label: "Tableau blanc" },
] as const;

/**
 * Mémorise la vue choisie côté serveur (cahier des charges §7 : "chaque
 * utilisateur choisit sa vue") sans bloquer la navigation : l'appel part en
 * tâche de fond pendant que le <Link> navigue normalement.
 */
export function TaskViewSwitcher({ activeVue, hrefFor }: { activeVue: string; hrefFor: (vue: string) => string }) {
  return (
    <div className="flex flex-wrap rounded-md border">
      {VIEWS.map((v, i) => (
        <Link key={v.key} href={hrefFor(v.key)} onClick={() => void setDefaultTaskView(v.key)}>
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
