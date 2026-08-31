"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { createAuditMission } from "@/actions/audit.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toneForAuditMissionStatus } from "@/lib/status-tone";
import { ChevronRight } from "lucide-react";

export type AuditMissionRow = {
  id: string;
  titre: string;
  statut: string;
  constatsCount: number;
};

const STATUT_LABELS: Record<string, string> = {
  PREPARATION: "Préparation",
  COLLECTE: "Collecte",
  VERIFICATION: "Vérification",
  RAPPORT: "Rapport",
  CLOTUREE: "Clôturée",
};

export function AuditMissionsPanel({
  planId,
  missions,
  canManage,
}: {
  planId: string;
  missions: AuditMissionRow[];
  canManage: boolean;
}) {
  const [titre, setTitre] = useState("");
  const { run: create, isPending } = useAction(createAuditMission, { successMessage: "Mission créée." });

  async function handleCreate() {
    if (!titre.trim()) return;
    const result = await create({ planId, titre: titre.trim() });
    if (result.ok) setTitre("");
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex gap-2">
          <Input placeholder="Titre de la nouvelle mission" value={titre} onChange={(e) => setTitre(e.target.value)} />
          <Button size="sm" onClick={handleCreate} disabled={isPending || !titre.trim()}>
            {isPending ? "Création..." : "Créer"}
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {missions.map((m) => (
          <Link
            key={m.id}
            href={`/audit/${planId}/missions/${m.id}`}
            className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">{m.titre}</p>
              <p className="text-xs text-muted-foreground">{m.constatsCount} constat(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={toneForAuditMissionStatus(m.statut)}>{STATUT_LABELS[m.statut]}</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
        {missions.length === 0 && <p className="text-sm text-muted-foreground">Aucune mission pour ce plan.</p>}
      </div>
    </div>
  );
}
