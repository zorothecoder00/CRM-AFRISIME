import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeWorkload } from "@/lib/workload";
import { WorkloadTable } from "@/components/workload/workload-table";
import { ChevronLeft } from "lucide-react";

/**
 * "Planning de mon équipe" — détail d'une équipe. Reprend le contenu de
 * /pilotage/equipe/[teamId] (mêmes colonnes via WorkloadTable) mais rendu
 * DANS le module Planning personnel (demande utilisateur — l'ancienne
 * version redirigeait vers /pilotage, ce qui faisait sortir l'utilisateur
 * de la coquille dédiée du module, cf. layout.tsx). Restreint au
 * responsable de l'équipe (pas DASHBOARD_READ générique comme /pilotage,
 * qui lui montre n'importe quelle équipe) — cohérent avec le filtre
 * leaderId de la page parente /planning-personnel/equipe.
 */
export default async function PersonalPlanningEquipeDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/planning-personnel");
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      department: { select: { id: true, name: true } },
      leader: { select: { id: true, name: true } },
      members: { include: { user: { include: { role: true, site: true } } } },
    },
  });
  if (!team || team.leaderId !== session!.user.id) notFound();

  const userIds = team.members.map((m) => m.userId);
  const [tasks, leaves, missions] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: { in: userIds } }, { assignees: { some: { userId: { in: userIds } } } }],
      },
      include: { assignees: { select: { userId: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE", userId: { in: userIds } } }),
    prisma.personalPlanningEntry.findMany({
      where: { type: "MISSION", statut: { not: "ANNULEE" }, userId: { in: userIds } },
      select: { userId: true, dateDebut: true, dateFin: true, statut: true },
    }),
  ]);

  const workload = computeWorkload(
    team.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      roleLabel: m.user.role.label,
      siteLabel: m.user.site?.nom ?? null,
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
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut })),
    undefined,
    missions
  );

  const canManage = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_MANAGE);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/planning-personnel/equipe" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-3.5 w-3.5" />
          Mes équipes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{team.nom}</h1>
        <p className="text-sm text-muted-foreground">
          Charge de travail des {team.members.length} membre(s)
          {team.department ? ` — ${team.department.name}` : ""}.
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
