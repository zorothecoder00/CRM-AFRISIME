"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { shareActivityReport, unshareActivityReport } from "@/actions/activity-report.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, X, Users, User as UserIcon } from "lucide-react";

type Option = { id: string; label: string };
type Share = { id: string; userId: string | null; userName: string | null; teamId: string | null; teamName: string | null };

/** /rapports, bloc "Rapports d'activité (manuels)" — partage d'un rapport importé à un utilisateur ou une équipe (§ groupe). */
export function ActivityReportShareDialog({
  reportId,
  reportTitre,
  shares,
  users,
  teams,
}: {
  reportId: string;
  reportTitre: string;
  shares: Share[];
  users: Option[];
  teams: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>("");
  const { run: share, isPending: isSharing } = useAction(shareActivityReport, { successMessage: "Rapport partagé." });
  const { run: unshare, isPending: isUnsharing } = useAction(unshareActivityReport, { successMessage: "Partage révoqué." });

  const sharedUserIds = new Set(shares.filter((s) => s.userId).map((s) => s.userId));
  const sharedTeamIds = new Set(shares.filter((s) => s.teamId).map((s) => s.teamId));
  const availableOptions = [
    ...users.filter((u) => !sharedUserIds.has(u.id)).map((u) => ({ ...u, kind: "user" as const })),
    ...teams.filter((t) => !sharedTeamIds.has(t.id)).map((t) => ({ ...t, kind: "team" as const })),
  ];

  async function handleShare() {
    if (!target) return;
    const [kind, id] = target.split(":");
    const result = await share(kind === "user" ? { reportId, userId: id } : { reportId, teamId: id });
    if (result.ok) {
      setTarget("");
      router.refresh();
    }
  }

  async function handleUnshare(shareId: string) {
    const result = await unshare({ shareId });
    if (result.ok) router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Partager" aria-label="Partager">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager « {reportTitre} »</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shares.length > 0 && (
            <div className="space-y-1.5">
              {shares.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <Badge variant="secondary" className="gap-1">
                    {s.teamId ? <Users className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                    {s.teamId ? s.teamName : s.userName}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isUnsharing}
                    onClick={() => handleUnshare(s.id)}
                    title="Révoquer ce partage"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {availableOptions.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choisir un utilisateur ou une équipe" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u) => !sharedUserIds.has(u.id)).length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Utilisateurs</SelectLabel>
                      {users
                        .filter((u) => !sharedUserIds.has(u.id))
                        .map((u) => (
                          <SelectItem key={`user:${u.id}`} value={`user:${u.id}`}>
                            {u.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  )}
                  {teams.filter((t) => !sharedTeamIds.has(t.id)).length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Équipes</SelectLabel>
                      {teams
                        .filter((t) => !sharedTeamIds.has(t.id))
                        .map((t) => (
                          <SelectItem key={`team:${t.id}`} value={`team:${t.id}`}>
                            {t.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!target || isSharing} onClick={handleShare}>
                Partager
              </Button>
            </div>
          ) : (
            shares.length === 0 && <p className="text-sm text-muted-foreground">Aucun utilisateur ni équipe disponible.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
