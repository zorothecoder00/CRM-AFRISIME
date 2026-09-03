import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { MyWorkloadCard } from "@/components/workload/my-workload-card";

/**
 * "Temps / Charge" (prototype V2) — page dédiée au module Planning
 * personnel : strictement MA charge de travail (jamais celle de l'équipe,
 * même pour un super admin) — la version générale (/charge-de-travail),
 * avec "Charge de l'équipe" pour les managers, reste à part.
 */
export default async function PersonalPlanningChargeDeTravailPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [me, tasks, leaves, missions] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
      include: { assignees: { select: { userId: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE", userId } }),
    prisma.personalPlanningEntry.findMany({
      where: { type: "MISSION", statut: { not: "ANNULEE" }, userId },
      select: { userId: true, dateDebut: true, dateFin: true, statut: true },
    }),
  ]);

  const [myWorkload] = computeWorkload(
    [{ id: me.id, name: me.name, roleLabel: me.role.label, capaciteHebdomadaireHeures: Number(me.capaciteHebdomadaireHeures) }],
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut })),
    undefined,
    missions
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      <div>
        <h1 className="text-2xl font-semibold">Temps / Charge</h1>
        <p className="text-sm text-muted-foreground">
          Nombre de tâches, taux d&apos;occupation, disponibilité et temps moyen de réalisation, calculés
          automatiquement à partir de mes tâches actives.
        </p>
      </div>

      {myWorkload && <MyWorkloadCard workload={myWorkload} />}
    </div>
  );
}
