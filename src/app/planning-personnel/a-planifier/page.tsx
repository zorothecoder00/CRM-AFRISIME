import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { APlanifierTaskRow, type APlanifierTask } from "@/components/personal-planning/a-planifier-task-row";
import { Inbox } from "lucide-react";

/**
 * §13/§29 — "À planifier" comme vraie page de gestion des tâches sans
 * date (au lieu du simple ancrage vers l'aperçu plafonné du hub) :
 * affecter à un collègue, lier à une activité (planifier sans passer par
 * le calendrier), ou supprimer — sans limite d'affichage.
 */
export default async function PersonalPlanningAPlanifierPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [tasksRaw, colleaguesRaw] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        dateDebut: null,
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
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div className="flex items-center gap-2">
        <Inbox className="size-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">À planifier — Inbox</h1>
          <p className="text-sm text-muted-foreground">Capture → interprétation → proposition de créneau → validation</p>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tâche(s) sans date — affectez-les, liez-les à une activité, ou supprimez-les.
          </p>
        </div>
      </div>

      <div className="space-y-2">
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
  );
}
