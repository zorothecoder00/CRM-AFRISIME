"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { classifyData } from "@/actions/data-classification.actions";
import {
  DATA_CLASSIFICATION_LEVELS,
  DATA_SENSITIVITIES,
  DATA_QUALITY_NIVEAUX,
} from "@/lib/validations/data-classification.schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const NIVEAU_TONE: Record<string, "secondary" | "info" | "warning" | "destructive"> = {
  PUBLIC: "secondary",
  INTERNE: "info",
  CONFIDENTIEL: "warning",
  RESTREINT: "destructive",
};

export type DocumentClassifyRowData = {
  documentId: string;
  documentNom: string;
  niveau: string;
  sensibilite: string;
  qualite: string;
  proprietaireId: string;
};

export function DocumentClassifyRow({
  data,
  users,
}: {
  data: DocumentClassifyRowData;
  users: { id: string; label: string }[];
}) {
  const router = useRouter();
  const { run, isPending } = useAction(classifyData);

  function update(patch: Partial<{ niveau: string; sensibilite: string; qualite: string; proprietaireId: string }>) {
    run({
      entityType: "Document",
      entityId: data.documentId,
      niveau: (patch.niveau ?? data.niveau) as (typeof DATA_CLASSIFICATION_LEVELS)[number],
      sensibilite: (patch.sensibilite ?? data.sensibilite) as (typeof DATA_SENSITIVITIES)[number],
      qualite: (patch.qualite ?? data.qualite) as (typeof DATA_QUALITY_NIVEAUX)[number],
      proprietaireId: patch.proprietaireId ?? data.proprietaireId ?? undefined,
    }).then(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{data.documentNom}</span>
        <Badge variant={NIVEAU_TONE[data.niveau]}>{data.niveau}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={data.niveau} onValueChange={(v) => update({ niveau: v })} disabled={isPending}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_CLASSIFICATION_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={data.sensibilite} onValueChange={(v) => update({ sensibilite: v })} disabled={isPending}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_SENSITIVITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={data.qualite} onValueChange={(v) => update({ qualite: v })} disabled={isPending}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_QUALITY_NIVEAUX.map((q) => (
              <SelectItem key={q} value={q}>
                {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={data.proprietaireId || "none"} onValueChange={(v) => update({ proprietaireId: v === "none" ? "" : v })} disabled={isPending}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Propriétaire" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun propriétaire</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
