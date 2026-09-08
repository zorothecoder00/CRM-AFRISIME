import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { IncidentReportForm } from "@/components/incidents/incident-report-form";
import { IncidentCard } from "@/components/incidents/incident-card";
import { UrlPagination } from "@/components/ui/url-pagination";

const PAGE_SIZE = 20;

// Incidents (cahier des charges V3.0 §42, "Mobile-First Execution") — le
// modèle Incident (v2.0 §10) n'avait aucune page jusqu'ici malgré son usage
// dans digital-twin/early-warning/organizational-memory/reports. Le
// signalement reste ouvert à tout collaborateur ; seule la gestion
// (changement de statut, escalade) est réservée à RISK_MANAGE.
//
// Pagination reelle (retour utilisateur) — la liste etait bridee a 100
// resultats sans aucun moyen d'en voir davantage ; page=N via UrlPagination.
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.RISK_MANAGE);

  const [incidents, total, projects, users] = await Promise.all([
    prisma.incident.findMany({
      orderBy: { dateDeclaration: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { declarePar: { select: { name: true } }, project: { select: { nom: true } } },
    }),
    prisma.incident.count(),
    prisma.project.findMany({
      where: { statut: { in: ["PLANIFIE", "EN_COURS"] } },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
    canManage
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <p className="text-sm text-muted-foreground">
          Signalement et suivi des incidents terrain — {total} au total.
        </p>
      </div>

      <IncidentReportForm projects={projects.map((p) => ({ id: p.id, label: p.nom }))} />

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun incident signalé.</p>
        ) : (
          incidents.map((i) => (
            <IncidentCard
              key={i.id}
              incident={i}
              canManage={canManage}
              escalateTargets={users.filter((u) => u.id !== i.declareParId).map((u) => ({ id: u.id, label: u.name }))}
            />
          ))
        )}
      </div>

      <UrlPagination page={page} totalPages={totalPages} />
    </div>
  );
}
