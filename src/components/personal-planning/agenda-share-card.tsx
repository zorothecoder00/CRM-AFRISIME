"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { shareAgenda, revokeAgendaShare } from "@/actions/personal-planning-share.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, X } from "lucide-react";

type Option = { id: string; label: string };
type Share = { id: string; granteeId: string; granteeName: string };

/**
 * Partage du planning personnel (demande utilisateur — "partager son agenda
 * avec une secrétaire par exemple") : octroi en lecture seule à n'importe
 * quel collègue, sans lien hiérarchique requis. Le bénéficiaire consulte
 * ensuite via /planning-personnel/equipe/[userId], comme un manager.
 */
export function AgendaShareCard({ shares, colleagues }: { shares: Share[]; colleagues: Option[] }) {
  const [selected, setSelected] = useState<string>("");
  const { run: share, isPending: isSharing } = useAction(shareAgenda, { successMessage: "Agenda partagé." });
  const { run: revoke, isPending: isRevoking } = useAction(revokeAgendaShare, { successMessage: "Partage révoqué." });

  const alreadySharedIds = new Set(shares.map((s) => s.granteeId));
  const availableColleagues = colleagues.filter((c) => !alreadySharedIds.has(c.id));

  async function handleShare() {
    if (!selected) return;
    const result = await share(selected);
    if (result.ok) setSelected("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4" />
          Partager mon agenda
        </CardTitle>
        <CardDescription>
          Donne à quelqu&apos;un (ex. une secrétaire) un accès en lecture à votre planning détaillé, sans lien
          hiérarchique — comme un manager le verrait.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {shares.length > 0 && (
          <div className="space-y-1.5">
            {shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Badge variant="secondary">{s.granteeName}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={isRevoking}
                  onClick={() => revoke(s.id)}
                  title="Révoquer ce partage"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableColleagues.length > 0 ? (
          <div className="flex items-center gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Choisir un collègue" />
              </SelectTrigger>
              <SelectContent>
                {availableColleagues.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!selected || isSharing} onClick={handleShare}>
              Partager
            </Button>
          </div>
        ) : (
          shares.length === 0 && <p className="text-sm text-muted-foreground">Aucun collègue disponible.</p>
        )}
      </CardContent>
    </Card>
  );
}
