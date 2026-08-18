"use client";

import { useAction } from "@/hooks/use-action";
import { revokeUserSession } from "@/actions/session.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor } from "lucide-react";

export type SessionRow = {
  id: string;
  userName?: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
};

function RevokeButton({ id }: { id: string }) {
  const { run, isPending } = useAction(revokeUserSession, { successMessage: "Session révoquée." });
  return (
    <Button variant="destructive" size="sm" disabled={isPending} onClick={() => run(id)}>
      Révoquer
    </Button>
  );
}

/** Liste de sessions actives (cahier des charges V2.2 §36) — réutilisée pour "mes sessions" et la vue admin. */
export function SessionList({ sessions, currentSessionId }: { sessions: SessionRow[]; currentSessionId?: string }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune session active.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex items-start gap-2">
              <Monitor className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2 text-sm">
                  {s.userName && <span className="font-medium">{s.userName}</span>}
                  <span className="text-muted-foreground">{s.userAgent ?? "Appareil inconnu"}</span>
                  {s.id === currentSessionId && <Badge variant="info">Cette session</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress ?? "IP inconnue"} · dernière activité{" "}
                  {new Date(s.lastSeenAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
            <RevokeButton id={s.id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
