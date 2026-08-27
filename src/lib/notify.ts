import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@/generated/prisma/enums";
import type { NotificationChannel, NotificationNiveau, NotificationType } from "@/generated/prisma/enums";

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];
const DEADLINE_SOON_DAYS = 2;

// V2.2 §39 — "Notification 2.0" : chaque NotificationType existant (§18)
// est classé dans l'un des 6 niveaux abstraits du cahier des charges, une
// seule fois ici plutôt que sur chacun des ~15 sites d'appel de
// createNotification. Les types absents (ex. futurs ajouts) retombent sur
// INFORMATION par défaut.
const NOTIFICATION_NIVEAU_BY_TYPE: Partial<Record<NotificationType, NotificationNiveau>> = {
  NOUVELLE_TACHE: "INFORMATION",
  MODIFICATION: "INFORMATION",
  COMMENTAIRE: "INFORMATION",
  MENTION: "INFORMATION",
  RELANCE_PLANIFIEE: "RAPPEL",
  ECHEANCE_PROCHE: "RAPPEL",
  RAPPORT_HEBDOMADAIRE: "RAPPEL",
  VALIDATION: "VALIDATION",
  SURCHARGE: "ALERTE",
  CLIENT_SANS_SUIVI: "ALERTE",
  BUDGET_DEPASSE: "ALERTE",
  CONTRAT_EXPIRE: "ALERTE",
  REUNION_INVITATION: "INFORMATION",
  DEMANDE_DISPONIBILITE: "INFORMATION",
  DEMANDE_DISPONIBILITE_DECISION: "VALIDATION",
  RETARD: "URGENCE",
  TACHE_CRITIQUE: "URGENCE",
};

/**
 * Crée une notification de façon idempotente : la contrainte unique
 * (userId, type, entityType, entityId) empêche le doublon si la même
 * action déclenche deux fois le même événement pour la même personne.
 * entityType/entityId sont volontairement obligatoires : Prisma ne permet
 * pas de valeur NULL fiable dans une clé de recherche composite unique.
 *
 * V2.2 §39 : `channels` (par défaut INTERNE seul) est croisé avec les
 * préférences de l'utilisateur (`User.notificationChannelsPreferred`) —
 * seuls les canaux demandés ET préférés déclenchent une tentative
 * d'envoi externe, journalisée sans envoi réel (aucun fournisseur SMTP/SMS/
 * push configuré, même statut que SEND_EMAIL dans automation.ts).
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  titre: string;
  lien?: string;
  entityType: string;
  entityId: string;
  channels?: NotificationChannel[];
}) {
  const { userId, type, titre, lien, entityType, entityId } = params;
  const channels = params.channels ?? ["INTERNE"];
  const niveau: NotificationNiveau = NOTIFICATION_NIVEAU_BY_TYPE[type] ?? "INFORMATION";

  await prisma.notification.upsert({
    where: {
      userId_type_entityType_entityId: { userId, type, entityType, entityId },
    },
    update: {},
    create: { userId, type, titre, lien, entityType, entityId, channels, niveau },
  });

  const externalChannels = channels.filter((c) => c !== "INTERNE");
  if (externalChannels.length > 0) {
    await attemptExternalDelivery(userId, externalChannels, titre);
  }
}

/**
 * Tentative d'envoi externe (V2.2 §39) — journalise l'intention sans envoi
 * réel, croisée avec les préférences de l'utilisateur. Aucun fournisseur
 * SMTP/SMS/push n'est câblé dans cette version (voir mémoire projet :
 * même blocage que l'email §18 et l'IA §15 — pas de clé API disponible).
 */
async function attemptExternalDelivery(userId: string, requestedChannels: NotificationChannel[], titre: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationChannelsPreferred: true } });
  if (!user) return;

  const matched = requestedChannels.filter((c) => user.notificationChannelsPreferred.includes(c));
  if (matched.length === 0) return;

  await prisma.auditLog.create({
    data: {
      userId,
      action: "notification.external_delivery_attempted",
      entityType: "Notification",
      entityId: userId,
      changes: { channels: matched, titre },
    },
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
