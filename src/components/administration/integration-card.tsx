"use client";

import { useAction } from "@/hooks/use-action";
import { updateIntegrationStatus, deleteIntegration } from "@/actions/integration.actions";
import { Card, CardContent, CardHeader, CardTitle, type CardAccent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IntegrationRow = {
  id: string;
  nom: string;
  type: string;
  statut: string;
  apiKey: string | null;
  events: { id: string; eventType: string; receivedAt: Date }[];
};

const STATUS_LABELS: Record<string, string> = {
  CONNECTE: "Connecté",
  DECONNECTE: "Déconnecté",
  ERREUR: "Erreur",
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive"> = {
  CONNECTE: "success",
  DECONNECTE: "secondary",
  ERREUR: "destructive",
};

const STATUS_ACCENT: Record<string, CardAccent> = {
  CONNECTE: "success",
  DECONNECTE: "none",
  ERREUR: "destructive",
};

export function IntegrationCard({ integration }: { integration: IntegrationRow }) {
  const statusAction = useAction(updateIntegrationStatus);
  const deleteAction = useAction(deleteIntegration, { successMessage: "Intégration supprimée." });
  const isPending = statusAction.isPending || deleteAction.isPending;

  async function handleStatusChange(statut: string) {
    await statusAction.run(integration.id, statut);
  }

  async function handleDelete() {
    await deleteAction.run(integration.id);
  }

  return (
    <Card accent={STATUS_ACCENT[integration.statut]}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{integration.nom}</CardTitle>
        <Badge variant={STATUS_VARIANT[integration.statut]}>{STATUS_LABELS[integration.statut]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Type : {integration.type}</p>
        {integration.apiKey && (
          <p className="text-muted-foreground">
            Clé API : <code>••••{integration.apiKey.slice(-4)}</code>
          </p>
        )}
        <p className="text-muted-foreground">
          Webhook entrant :{" "}
          <code className="break-all">/api/webhooks/{integration.id}</code>
        </p>

        {integration.events.length > 0 && (
          <div>
            <p className="font-medium">Derniers événements</p>
            <ul className="mt-1 space-y-1">
              {integration.events.map((e) => (
                <li key={e.id} className="text-xs text-muted-foreground">
                  {e.eventType} — {e.receivedAt.toLocaleString("fr-FR")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Select defaultValue={integration.statut} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONNECTE">Connecté</SelectItem>
              <SelectItem value="DECONNECTE">Déconnecté</SelectItem>
              <SelectItem value="ERREUR">Erreur</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
