import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { Sparkles } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

/**
 * Sélecteur de projet pour Project Studio -- les fonctionnalités du cahier
 * des charges sont toutes rattachées à un projet précis (WBS, budget,
 * risques... d'UN projet), donc cette page choisit d'abord le projet avant
 * de renvoyer vers /projets/studio/[projectId].
 */
export default async function ProjectStudioPickerPage() {
  const session = await getServerSession(authOptions);
  const scope = projectVisibilityWhere(session!.user.roleKey, session!.user.id);

  const projects = await prisma.project.findMany({
    where: { deletedAt: null, ...scope },
    select: { id: true, nom: true, statut: true, department: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Project Studio</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Choisissez un projet pour ouvrir sa conception, sa planification, son budget, ses risques, sa qualité,
            son exécution et son suivi-évaluation -- tout ce qu&apos;apporte le cahier des charges Project Studio.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun projet accessible pour le moment.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projets/studio/${p.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{p.nom}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.department.name}</span>
                  <Badge variant={toneForStatus(p.statut)}>{STATUS_LABELS[p.statut]}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
