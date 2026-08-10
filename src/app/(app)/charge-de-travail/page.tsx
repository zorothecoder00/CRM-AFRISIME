import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeWorkload } from "@/lib/workload";
import { MyWorkloadCard } from "@/components/workload/my-workload-card";
import { WorkloadTable } from "@/components/workload/workload-table";

export default async function ChargeDeTravailPage() {
  const session = await getServerSession(authOptions);
  const canRead = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_READ);
  const canManage = session!.user.permissions.includes(PERMISSIONS.WORKLOAD_MANAGE);

  const [users, tasks, leaves] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      include: { assignees: { select: { userId: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
  ]);

  const workload = computeWorkload(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves.map((l) => ({
      userId: l.userId,
      dateDebut: l.dateDebut,
      dateFin: l.dateFin,
      statut: l.statut,
    }))
  );

  const myWorkload = workload.find((w) => w.userId === session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Charge de travail</h1>
        <p className="text-sm text-muted-foreground">
          Nombre de tâches, taux d&apos;occupation, disponibilité et temps moyen de réalisation,
          calculés automatiquement à partir des tâches actives.
        </p>
      </div>

      {myWorkload && <MyWorkloadCard workload={myWorkload} />}

      {canRead && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Charge de l&apos;équipe</h2>
          <WorkloadTable rows={workload} canManage={canManage} />
        </div>
      )}
    </div>
  );
}
