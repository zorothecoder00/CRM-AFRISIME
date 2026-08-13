import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { computeIndividualPilotage } from "@/lib/individual-pilotage";
import { StatCard, type StatCardTone } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/messages/user-avatar";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { ListChecks, Clock, Gauge, Star, Target, ChevronRight } from "lucide-react";

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

function toneForRate(rate: number | null): StatCardTone {
  if (rate === null) return "default";
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "danger";
}

/** Niveau 7 — Individu (cahier des charges §XXIII) : performance d'un seul collaborateur. */
export default async function IndividualPilotagePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }

  const p = await computeIndividualPilotage(userId);

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/pilotage" className="hover:underline">
            Organisation
          </Link>
          {p.user.departmentId && (
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href={`/pilotage/departement/${p.user.departmentId}`} className="hover:underline">
                {p.user.department?.name}
              </Link>
            </span>
          )}
          <span className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{p.user.name}</span>
          </span>
        </nav>
        <div className="mt-1 flex items-center gap-3">
          <UserAvatar name={p.user.name} image={p.user.image} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{p.user.name}</h1>
              <Badge variant="secondary">Niveau — Individu</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{p.user.role.label}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tâches en cours"
          value={p.tachesEnCours}
          icon={ListChecks}
          tone="info"
          description={`${p.tachesTermineesTotal} terminée(s) au total`}
        />
        <StatCard
          label="Tâches en retard"
          value={p.tachesEnRetard}
          icon={Clock}
          tone={p.tachesEnRetard > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Respect des délais"
          value={p.tauxRespectDelais !== null ? `${p.tauxRespectDelais}%` : "—"}
          icon={Gauge}
          tone={toneForRate(p.tauxRespectDelais)}
        />
        <StatCard
          label="Charge actuelle"
          value={p.tauxOccupation !== null ? `${p.tauxOccupation}%` : "—"}
          icon={Gauge}
          tone={p.tauxOccupation !== null && p.tauxOccupation > 100 ? "danger" : "info"}
        />
        <StatCard
          label="Score d'évaluation moyen"
          value={p.scoreEvaluationMoyen !== null ? `${p.scoreEvaluationMoyen} / 5` : "—"}
          icon={Star}
          tone={toneForRate(p.scoreEvaluationMoyen !== null ? p.scoreEvaluationMoyen * 20 : null)}
          description={`${p.evaluationsCount} évaluation(s) soumise(s)`}
        />
        <StatCard
          label="Objectifs atteints"
          value={p.objectifsTotal > 0 ? `${p.objectifsAtteints}/${p.objectifsTotal}` : "—"}
          icon={Target}
          tone={toneForRate(p.objectifsTotal > 0 ? Math.round((p.objectifsAtteints / p.objectifsTotal) * 100) : null)}
          description={`${p.objectifsEnCours} en cours`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/evaluations`}>
          <Badge variant="outline">Voir les évaluations →</Badge>
        </Link>
        <Link href={`/objectifs`}>
          <Badge variant="outline">Voir les objectifs →</Badge>
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Projets ({p.projects.length})</h2>
        {p.projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun projet rattaché.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.projects.map((project) => (
              <Link key={project.id} href={`/projets/${project.id}`}>
                <Card
                  accent={accentForStatus(project.statut)}
                  className="transition-all hover:-translate-y-0.5 hover:bg-muted/50"
                >
                  <CardContent className="space-y-1 py-3">
                    <div className="text-sm font-medium">{project.nom}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={toneForStatus(project.statut)}>{PROJECT_STATUS_LABELS[project.statut]}</Badge>
                      <span className="text-xs text-muted-foreground">{project.avancement}%</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
