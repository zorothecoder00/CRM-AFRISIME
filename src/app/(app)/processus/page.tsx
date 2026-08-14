import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { ProcessusFormDialog } from "@/components/processus/processus-form-dialog";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  ARCHIVE: "Archivé",
};

export default async function ProcessusPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROCESS_MANAGE);

  const [processus, users] = await Promise.all([
    prisma.processus.findMany({
      include: {
        processusParent: true,
        responsable: true,
        _count: { select: { etapes: true, executions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Processus</h1>
          <p className="text-sm text-muted-foreground">{processus.length} processus</p>
        </div>
        {canManage && (
          <ProcessusFormDialog
            processus={processus.map((p) => ({ id: p.id, label: p.nom }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {processus.map((p) => (
          <Link key={p.id} href={`/processus/${p.id}`}>
            <Card
              accent={accentForStatus(p.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{p.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.processusParent && (
                  <p className="text-xs text-muted-foreground">Sous-processus de {p.processusParent.nom}</p>
                )}
                {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toneForStatus(p.statut)}>{STATUT_LABELS[p.statut]}</Badge>
                  <Badge variant="outline">v{p.version}</Badge>
                  <Badge variant="secondary">{p._count.etapes} étape(s)</Badge>
                  <Badge variant="secondary">{p._count.executions} dossier(s)</Badge>
                </div>
                {p.responsable && (
                  <p className="text-xs text-muted-foreground">Responsable : {p.responsable.name}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {processus.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun processus pour le moment.</p>
        )}
      </div>
    </div>
  );
}
