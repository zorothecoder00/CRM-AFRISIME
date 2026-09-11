import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { TeamFormDialog } from "@/components/administration/team-form-dialog";
import { Users } from "lucide-react";

/**
 * "Planning de mon équipe" (prototype V2, groupe Management) — point
 * d'entrée "mon équipe" : redirige vers /planning-personnel/equipe/[teamId]
 * (même contenu que /pilotage/equipe/[teamId] — mêmes colonnes
 * Collaborateur/Charge/En retard/Bloquées/Disponibilité via WorkloadTable
 * showTaskCounts — mais rendu DANS ce module, pas dans /pilotage : sortir de
 * la coquille dédiée du planning personnel pour y arriver cassait la
 * navigation, demande utilisateur) pour l'équipe que dirige l'utilisateur ;
 * liste de choix s'il en dirige plusieurs.
 *
 * Revue fonctionnelle (2026-09-11) — n'importe qui peut désormais créer une
 * équipe (bouton ci-dessous) et en devient automatiquement responsable
 * (voir team.actions.ts::createTeam) : plus seulement une page de
 * consultation pour qui dirige déjà une équipe.
 */
export default async function PersonalPlanningEquipePage() {
  const session = await getAppSession();
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/planning-personnel");
  }
  const userId = session!.user.id;

  const [teams, departments] = await Promise.all([
    prisma.team.findMany({
      where: { leaderId: userId },
      select: { id: true, nom: true, department: { select: { name: true } }, _count: { select: { members: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (teams.length === 1) {
    redirect(`/planning-personnel/equipe/team/${teams[0].id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Planning de mon équipe</h1>
            <p className="text-sm text-muted-foreground">
              {teams.length > 0 ? "Choisissez l'équipe à afficher." : "Vous ne dirigez aucune équipe pour le moment."}
            </p>
          </div>
        </div>
        <TeamFormDialog departments={departments.map((d) => ({ id: d.id, label: d.name }))} />
      </div>

      {teams.length > 0 ? (
        <div className="space-y-2">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/planning-personnel/equipe/team/${t.id}`}
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/40"
            >
              <div>
                <div className="font-medium">{t.nom}</div>
                <div className="text-xs text-muted-foreground">{t.department.name}</div>
              </div>
              <span className="text-xs text-muted-foreground">{t._count.members} membre(s)</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Créez une équipe (bouton ci-dessus) pour en devenir responsable et en voir la charge de travail.
        </p>
      )}
    </div>
  );
}
