import Link from "next/link";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { materialTone } from "@/lib/card-tones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { ProgrammeFormDialog } from "@/components/programmes/programme-form-dialog";

// Demande utilisateur — blocs de programme sur fonds colores Material
// (materialTone, lib/card-tones.ts), attribues en rotation. bg-none! retire le
// degrade de l'accent de statut (qui masquerait la couleur de fond) ; la barre
// de statut en tete de carte est conservee.

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export default async function ProgrammesPage() {
  const session = await getAppSession();
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
        {programmes.map((programme, i) => (
          <Link key={programme.id} href={`/programmes/${programme.id}`}>
            <Card
              className={cn(
                "h-full transition-all hover:-translate-y-0.5 hover:brightness-95",
                materialTone(i),
              )}
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
