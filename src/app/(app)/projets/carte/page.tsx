import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { ProjectMapLoader } from "@/components/projects/project-map-loader";
import type { MappedProjectRow } from "@/components/projects/project-map";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export default async function ProjetsCartePage() {
  const session = await getServerSession(authOptions);
  const where = projectVisibilityWhere(session!.user.roleKey, session!.user.id);

  const projects = await prisma.project.findMany({
    where,
    select: { id: true, nom: true, statut: true, avancement: true, localisation: true, latitude: true, longitude: true },
    orderBy: { nom: "asc" },
  });

  const located = projects.filter(
    (p): p is typeof p & { latitude: number; longitude: number } => p.latitude !== null && p.longitude !== null
  );
  const unlocated = projects.filter((p) => p.latitude === null || p.longitude === null);

  const mapRows: MappedProjectRow[] = located.map((p) => ({
    id: p.id,
    nom: p.nom,
    statut: p.statut,
    avancement: p.avancement,
    localisation: p.localisation,
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Carte des projets</h1>
          <p className="text-sm text-muted-foreground">
            {located.length} projet(s) localisé(s)
            {unlocated.length > 0 && ` · ${unlocated.length} sans coordonnées`}
          </p>
        </div>
        <Link href="/projets">
          <Button variant="outline" size="sm">
            Retour aux projets
          </Button>
        </Link>
      </div>

      {located.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun projet localisé. Renseignez une latitude/longitude sur un projet (onglet Aperçu) pour le voir apparaître ici.
        </p>
      ) : (
        <ProjectMapLoader projects={mapRows} />
      )}

      {unlocated.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Sans coordonnées :</p>
          <div className="flex flex-wrap gap-2">
            {unlocated.map((p) => (
              <Link key={p.id} href={`/projets/${p.id}`}>
                <Badge variant={toneForStatus(p.statut)} className="cursor-pointer">
                  {p.nom} · {STATUS_LABELS[p.statut]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
