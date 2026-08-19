import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { IncidentReportForm } from "@/components/incidents/incident-report-form";
import { IncidentCard } from "@/components/incidents/incident-card";

// Incidents (cahier des charges V3.0 §42, "Mobile-First Execution") — le
// modèle Incident (v2.0 §10) n'avait aucune page jusqu'ici malgré son usage
// dans digital-twin/early-warning/organizational-memory/reports. Le
// signalement reste ouvert à tout collaborateur ; seule la gestion
// (changement de statut, escalade) est réservée à RISK_MANAGE.
export default async function IncidentsPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.RISK_MANAGE);

  const [incidents, projects, users] = await Promise.all([
    prisma.incident.findMany({
      orderBy: { dateDeclaration: "desc" },
      take: 100,
      include: { declarePar: { select: { name: true } }, project: { select: { nom: true } } },
    }),
    prisma.project.findMany({
      where: { statut: { in: ["PLANIFIE", "EN_COURS"] } },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
    canManage
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <p className="text-sm text-muted-foreground">Signalement et suivi des incidents terrain.</p>
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
    </div>
  );
}
