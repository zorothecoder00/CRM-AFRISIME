import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeWorkload } from "@/lib/workload";
import { WorkloadTable } from "@/components/workload/workload-table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

/**
 * Niveau 5 — Équipe (V2.2 §10, cahier des charges §XXIII). Distinct de la
 * liste "Équipe rattachée directement" de la page département (rattachement
 * hiérarchique par departmentId) : ici le périmètre est le modèle `Team`
 * (groupe transverse, TeamMember), avec la charge détaillée par membre
 * plutôt qu'un seul chiffre moyen (voir ScopePilotagePanel pour ce dernier).
 */
export default async function TeamPilotagePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      department: { select: { id: true, name: true } },
      leader: { select: { id: true, name: true } },
      members: { include: { user: { include: { role: true } } } },
    },
  });
  if (!team) notFound();

  const userIds = team.members.map((m) => m.userId);
  const [tasks, leaves] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: { in: userIds } }, { assignees: { some: { userId: { in: userIds } } } }],
      },
      include: { assignees: { select: { userId: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE", userId: { in: userIds } } }),
  ]);

  const workload = computeWorkload(
    team.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      roleLabel: m.user.role.label,
      capaciteHebdomadaireHeures: Number(m.user.capaciteHebdomadaireHeures),
    })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      echeance: t.echeance,
      dateDebut: t.dateDebut,
    })),
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
  );

  const canManage = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_MANAGE);

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/pilotage" className="hover:underline">
            Organisation
          </Link>
          {team.department && (
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href={`/pilotage/departement/${team.department.id}`} className="hover:underline">
                {team.department.name}
              </Link>
            </span>
          )}
          <span className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{team.nom}</span>
          </span>
        </nav>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{team.nom}</h1>
          <Badge variant="secondary">Niveau — Équipe</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Charge de travail des {team.members.length} membre(s)
          {team.leader ? ` — responsable : ${team.leader.name}` : ""}.
        </p>
      </div>

      {workload.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun membre dans cette équipe.</p>
      ) : (
        <WorkloadTable rows={workload} canManage={canManage} showTaskCounts />
      )}
    </div>
  );
}
