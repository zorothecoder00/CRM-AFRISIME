"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { deleteActivityReport } from "@/actions/trash.actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityReportShareDialog } from "@/components/rapports/activity-report-share-dialog";
import { Download, Trash2, Users, User as UserIcon } from "lucide-react";

type Option = { id: string; label: string };
type Share = { id: string; userId: string | null; userName: string | null; teamId: string | null; teamName: string | null };

export type ActivityReportRow = {
  id: string;
  titre: string;
  description: string | null;
  url: string;
  sizeBytes: number | null;
  createdByNom: string;
  createdById: string;
  createdAt: string;
  shares: Share[];
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** /rapports, bloc "Rapports d'activité (manuels)" — mêmes conventions de tableau (head/body) que les vues liste des tâches/projets. */
export function ActivityReportsList({
  reports,
  users,
  teams,
  currentUserId,
  canDeleteAny,
}: {
  reports: ActivityReportRow[];
  users: Option[];
  teams: Option[];
  currentUserId: string;
  canDeleteAny: boolean;
}) {
  const router = useRouter();
  const { run: remove, isPending: isDeleting } = useAction(deleteActivityReport, { successMessage: "Rapport supprimé." });

  async function handleDelete(report: ActivityReportRow) {
    if (!confirm(`Supprimer « ${report.titre} » ? Le rapport sera déplacé dans la corbeille.`)) return;
    const result = await remove(report.id);
    if (result.ok) router.refresh();
  }

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun rapport importé pour le moment.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Importé par</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Taille</TableHead>
            <TableHead>Partagé avec</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => {
            const canDelete = canDeleteAny || r.createdById === currentUserId;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <span className="font-medium">{r.titre}</span>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.createdByNom}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatSize(r.sizeBytes)}</TableCell>
                <TableCell>
                  {r.shares.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {r.shares.map((s) => (
                        <Badge key={s.id} variant="outline" className="gap-1 text-[10px]">
                          {s.teamId ? <Users className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                          {s.teamId ? s.teamName : s.userName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" asChild title="Exporter / télécharger">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <ActivityReportShareDialog reportId={r.id} reportTitre={r.titre} shares={r.shares} users={users} teams={teams} />
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Supprimer"
                        disabled={isDeleting}
                        onClick={() => handleDelete(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
