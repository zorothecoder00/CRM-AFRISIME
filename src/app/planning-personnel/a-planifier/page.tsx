import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APlanifierTaskRow, type APlanifierTask } from "@/components/personal-planning/a-planifier-task-row";
import { Inbox } from "lucide-react";

/**
 * §13/§29 — "À planifier" comme vraie page de gestion des tâches sans
 * créneau réel (au lieu du simple ancrage vers l'aperçu plafonné du hub) :
 * affecter à un collègue, lier à une activité (planifier sans passer par
 * le calendrier), ou supprimer — sans limite d'affichage.
 *
 * Critère volontairement basé uniquement sur personalPlanningEntries (pas
 * sur Task.dateDebut, éditable indépendamment via la fiche tâche) : une
 * tâche avec une simple date de début mais sans créneau réel n'a toujours
 * aucune plage horaire concrète, elle doit donc rester "à planifier".
 */
export default async function PersonalPlanningAPlanifierPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [tasksRaw, colleaguesRaw] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        personalPlanningEntries: { none: {} },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, titre: true, priorite: true, echeance: true, project: { select: { nom: true } } },
    }),
    prisma.user.findMany({
      where: { isActive: true, id: { not: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const tasks: APlanifierTask[] = tasksRaw.map((t) => ({
    id: t.id,
    titre: t.titre,
    priorite: t.priorite,
    projetNom: t.project.nom,
    echeance: t.echeance ? t.echeance.toISOString() : null,
  }));
  const colleagues = colleaguesRaw.map((c) => ({ id: c.id, label: c.name }));

  return (
    <div className="space-y-6">

      <div className="rounded-md border bg-card p-3">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-primary" />
          <div>
            <h1 className="text-base font-semibold">À planifier — Inbox</h1>
            <p className="text-xs text-muted-foreground">
              {tasks.length} tâche(s) sans créneau — affectez-les, liez-les à une activité, ou supprimez-les.
            </p>
          </div>
        </div>

        {/* Demande utilisateur — separateur visuel entre le bloc "inbox"
            (icone/titre/compteur) et la liste des taches : plus proche du
            bloc inbox (mt-2) que de la liste (mb-5), pas centre entre les
            deux (pas de space-y uniforme sur le conteneur). */}
        <div className="mt-2 mb-5 border-t" />

        <div className="space-y-1">
          {tasks.map((t) => (
            <APlanifierTaskRow key={t.id} task={t} colleagues={colleagues} />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">
              Aucune tâche en attente de planification.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
