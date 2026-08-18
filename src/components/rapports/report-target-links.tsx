"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };
type Format = { format: string; label: string };

// Rapports Département/Direction (V2.2 §32) — nécessitent un targetId en
// plus du type, contrairement aux autres rapports (organisation entière).
// Sélecteur client minimal : les liens de téléchargement se recalculent au
// changement de sélection, pas de soumission de formulaire.
export function ReportTargetLinks({
  type,
  options,
  formats,
  placeholder,
}: {
  type: string;
  options: Option[];
  formats: Format[];
  placeholder: string;
}) {
  const [targetId, setTargetId] = useState(options[0]?.id ?? "");

  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune entrée disponible.</p>;
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <Select value={targetId} onValueChange={setTargetId}>
        <SelectTrigger className="h-8 w-40">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {formats.map(({ format, label }) => (
        <a
          key={format}
          href={`/api/rapports/${type}?format=${format}&targetId=${targetId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {label}
        </a>
      ))}
    </div>
  );
}
