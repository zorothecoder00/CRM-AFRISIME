"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { updateIncidentStatut, escalateIncident } from "@/actions/incident.actions";
import { INCIDENT_STATUTS } from "@/lib/validations/incident.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUT_LABELS: Record<string, string> = {
  DECLARE: "Déclaré",
  QUALIFIE: "Qualifié",
  AFFECTE: "Affecté",
  EN_TRAITEMENT: "En traitement",
  VALIDE: "Validé",
  CLOTURE: "Clôturé",
};
const CRITICITE_TONE: Record<string, "secondary" | "warning" | "destructive"> = {
  FAIBLE: "secondary",
  MODERE: "secondary",
  IMPORTANT: "warning",
  ELEVE: "warning",
  CRITIQUE: "destructive",
};

export type IncidentCardData = {
  id: string;
  type: string;
  titre: string;
  description: string | null;
  criticite: string;
  statut: string;
  estEscalade: boolean;
  declarePar: { name: string };
  dateDeclaration: Date;
  project: { nom: string } | null;
  photos: string[];
};

export function IncidentCard({
  incident,
  canManage,
  escalateTargets,
}: {
  incident: IncidentCardData;
  canManage: boolean;
  escalateTargets: { id: string; label: string }[];
}) {
  const router = useRouter();
  const statutAction = useAction(updateIncidentStatut);
  const escalateAction = useAction(escalateIncident, { successMessage: "Incident escaladé." });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{incident.titre}</CardTitle>
        <div className="flex items-center gap-1.5">
          {incident.estEscalade && <Badge variant="destructive">Escaladé</Badge>}
          <Badge variant={CRITICITE_TONE[incident.criticite]}>{incident.criticite}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {incident.description && <p className="text-muted-foreground">{incident.description}</p>}
        <p className="text-xs text-muted-foreground">
          {incident.type} — signalé par {incident.declarePar.name} le {incident.dateDeclaration.toLocaleDateString("fr-FR")}
          {incident.project && ` — ${incident.project.nom}`}
        </p>
        {incident.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {incident.photos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Photo de l'incident" className="h-16 w-16 rounded-md border object-cover" />
              </a>
            ))}
          </div>
        )}

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={incident.statut}
              onValueChange={(v) => statutAction.run({ id: incident.id, statut: v as (typeof INCIDENT_STATUTS)[number] }).then(() => router.refresh())}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_STATUTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!incident.estEscalade && escalateTargets.length > 0 && (
              <Select
                onValueChange={(v) => escalateAction.run({ id: incident.id, escaladeAId: v }).then(() => router.refresh())}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Escalader à..." />
                </SelectTrigger>
                <SelectContent>
                  {escalateTargets.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : (
          <Badge variant="outline">{STATUT_LABELS[incident.statut]}</Badge>
        )}
      </CardContent>
    </Card>
  );
}
