import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { daysUntilPurge, TRASH_RETENTION_DAYS } from "@/lib/trash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrashItemActions } from "@/components/trash/trash-item-actions";
import { Trash2 } from "lucide-react";

// Corbeille (cahier des charges V2.2 §37) — les 3 entites soft-deletables
// (Project/Task/Document, voir prisma/schema.prisma). Purge manuelle
// uniquement, jamais automatique (voir le commentaire dans trash.actions.ts).
export default async function CorbeillePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.TRASH_MANAGE)) {
    redirect("/dashboard");
  }

  const [projects, tasks, documents] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: { not: null } },
      include: { deletedBy: { select: { name: true } } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { deletedAt: { not: null } },
      include: { deletedBy: { select: { name: true } }, project: { select: { nom: true } } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.document.findMany({
      where: { deletedAt: { not: null } },
      include: { deletedBy: { select: { name: true } }, project: { select: { nom: true } } },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trash2 className="size-6" />
        <div>
          <h1 className="text-2xl font-semibold">Corbeille</h1>
          <p className="text-sm text-muted-foreground">
            Éléments supprimés, restaurables. Suppression définitive uniquement manuelle (jamais de purge
            automatique) — {TRASH_RETENTION_DAYS} jours indicatifs avant recommandation de purge.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projets ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet dans la corbeille.</p>}
          {projects.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{p.nom}</p>
                <p className="text-xs text-muted-foreground">
                  Supprimé par {p.deletedBy?.name ?? "—"} le {p.deletedAt!.toLocaleDateString("fr-FR")}
                  {" · "}
                  <Badge variant="outline">{daysUntilPurge(p.deletedAt!)} j avant purge recommandée</Badge>
                </p>
              </div>
              <TrashItemActions entityType="Project" id={p.id} canPurge />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tâches ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">Aucune tâche dans la corbeille.</p>}
          {tasks.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{t.titre}</p>
                <p className="text-xs text-muted-foreground">
                  {t.project.nom} · Supprimée par {t.deletedBy?.name ?? "—"} le {t.deletedAt!.toLocaleDateString("fr-FR")}
                  {" · "}
                  <Badge variant="outline">{daysUntilPurge(t.deletedAt!)} j avant purge recommandée</Badge>
                </p>
              </div>
              <TrashItemActions entityType="Task" id={t.id} canPurge />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 && <p className="text-sm text-muted-foreground">Aucun document dans la corbeille.</p>}
          {documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{d.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {d.project.nom} · Supprimé par {d.deletedBy?.name ?? "—"} le {d.deletedAt!.toLocaleDateString("fr-FR")}
                  {" · "}
                  <Badge variant="outline">{daysUntilPurge(d.deletedAt!)} j avant purge recommandée</Badge>
                </p>
              </div>
              <TrashItemActions entityType="Document" id={d.id} canPurge />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
