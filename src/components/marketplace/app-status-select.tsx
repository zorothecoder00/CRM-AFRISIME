"use client";

import { useAction } from "@/hooks/use-action";
import { updateAppCatalogStatut } from "@/actions/app-catalog.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppCatalogStatut } from "@/generated/prisma/enums";

const STATUT_LABELS: Record<AppCatalogStatut, string> = {
  PLANIFIE: "Planifiée",
  BIENTOT: "Bientôt disponible",
  DISPONIBLE: "Disponible",
};

export function AppStatusSelect({ id, statut }: { id: string; statut: AppCatalogStatut }) {
  const { run, isPending } = useAction(updateAppCatalogStatut, { successMessage: "Statut mis à jour." });

  return (
    <Select value={statut} onValueChange={(v) => run(id, v as AppCatalogStatut)} disabled={isPending}>
      <SelectTrigger className="h-8 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUT_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
