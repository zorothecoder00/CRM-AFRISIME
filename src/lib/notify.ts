import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/enums";
import { TaskStatus } from "@/generated/prisma/enums";

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];
const DEADLINE_SOON_DAYS = 2;

/**
 * Crée une notification de façon idempotente : la contrainte unique
 * (userId, type, entityType, entityId) empêche le doublon si la même
 * action déclenche deux fois le même événement pour la même personne.
 * entityType/entityId sont volontairement obligatoires : Prisma ne permet
 * pas de valeur NULL fiable dans une clé de recherche composite unique.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  titre: string;
  lien?: string;
  entityType: string;
  entityId: string;
}) {
  const { userId, type, titre, lien, entityType, entityId } = params;
  await prisma.notification.upsert({
    where: {
      userId_type_entityType_entityId: { userId, type, entityType, entityId },
    },
    update: {},
    create: { userId, type, titre, lien, entityType, entityId },
  });
}

/** Notifie plusieurs destinataires, en excluant l'auteur de l'action. */
export async function notifyMany(
  userIds: string[],
  excludeUserId: string,
  params: Omit<Parameters<typeof createNotification>[0], "userId">
) {
  const targets = Array.from(new Set(userIds)).filter((id) => id !== excludeUserId);
  await Promise.all(targets.map((userId) => createNotification({ ...params, userId })));
}

/**
 * Génère à la volée les notifications « échéance proche » / « retard »
 * (cahier des charges §18) pour les tâches actives de l'utilisateur.
 * Pas de tâche planifiée réelle dans ce MVP : le calcul se déclenche à la
 * visite des pages Notifications/Tableau de bord ; la déduplication par
 * contrainte unique évite de spammer à chaque visite.
 */
export async function generateDeadlineNotifications(userId: string, today: Date = new Date()) {
  const soon = new Date(today.getTime() + DEADLINE_SOON_DAYS * 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
      statut: { in: ACTIVE_TASK_STATUSES },
      echeance: { not: null, lte: soon },
    },
    select: { id: true, titre: true, echeance: true },
  });

  await Promise.all(
    tasks.map((task) => {
      const isOverdue = task.echeance! < today;
      return createNotification({
        userId,
        type: isOverdue ? "RETARD" : "ECHEANCE_PROCHE",
        titre: isOverdue
          ? `Tâche en retard : ${task.titre}`
          : `Échéance proche : ${task.titre}`,
        lien: `/taches/${task.id}`,
        entityType: "Task",
        entityId: task.id,
      });
    })
  );
}
