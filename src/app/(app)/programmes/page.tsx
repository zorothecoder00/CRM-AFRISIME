import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { ProgrammeFormDialog } from "@/components/programmes/programme-form-dialog";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export default async function ProgrammesPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROGRAM_MANAGE);

  const [programmes, users] = await Promise.all([
    prisma.programme.findMany({
      include: { responsable: true, _count: { select: { projects: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Programmes</h1>
          <p className="text-sm text-muted-foreground">
            {programmes.length} programme(s) — regroupent plusieurs projets sous une même initiative.
          </p>
        </div>
        {canManage && <ProgrammeFormDialog users={users.map((u) => ({ id: u.id, label: u.name }))} />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {programmes.map((programme) => (
          <Link key={programme.id} href={`/programmes/${programme.id}`}>
            <Card
              accent={accentForStatus(programme.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{programme.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {programme.description || "Pas de description."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toneForStatus(programme.statut)}>{STATUS_LABELS[programme.statut]}</Badge>
                  <Badge variant="outline">{programme._count.projects} projet(s)</Badge>
                </div>
                <div className="text-xs text-muted-foreground">Responsable : {programme.responsable.name}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {programmes.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun programme pour le moment.</p>
        )}
      </div>
    </div>
  );
}
