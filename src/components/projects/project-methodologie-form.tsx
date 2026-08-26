"use client";

import { useAction } from "@/hooks/use-action";
import { updateProjectMethodologie } from "@/actions/project.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UpdateProjectMethodologieInput } from "@/lib/validations/project.schema";

const METHODOLOGIE_LABELS: Record<string, string> = {
  AGILE_SCRUM: "Agile Scrum",
  KANBAN: "Kanban",
  WATERFALL: "Prédictif (Waterfall)",
  HYBRIDE: "Hybride (Agile + Waterfall)",
  RBM: "Results-Based Management",
  LOGICAL_FRAMEWORK: "Cadre logique (Logical Framework)",
  THEORY_OF_CHANGE: "Théorie du changement",
};

/** Project Studio §61 (Project Methodology) — informatif, ne restreint aucune vue. */
export function ProjectMethodologieForm({ projectId, initialMethodologie }: { projectId: string; initialMethodologie: string | null }) {
  const { run } = useAction(updateProjectMethodologie, { successMessage: "Méthodologie mise à jour." });

  return (
    <Select
      value={initialMethodologie ?? undefined}
      onValueChange={(v) => run({ projectId, methodologie: v as UpdateProjectMethodologieInput["methodologie"] })}
    >
      <SelectTrigger className="h-8 w-full max-w-xs">
        <SelectValue placeholder="Non définie" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(METHODOLOGIE_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
