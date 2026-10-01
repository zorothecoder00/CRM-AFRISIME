import { prisma } from "@/lib/prisma";

/**
 * Retire un utilisateur du canal de discussion d'un departement, d'une
 * equipe ou d'un projet lorsqu'il le quitte (demande utilisateur
 * 2026-10-01 : un utilisateur change de departement/equipe continuait de
 * recevoir les messages — et les documents joints — de l'ancien).
 *
 * ensureDepartmentConversation / ensureTeamConversation /
 * ensureProjectConversation ne font qu'AJOUTER les membres manquants a
 * l'ouverture ; sans ce retrait explicite, la ligne ConversationParticipant
 * survivait au depart et l'acces (conditionne par cette ligne, voir
 * /messages/[conversationId]) restait ouvert indefiniment.
 *
 * Retrait fait au moment du changement d'appartenance plutot qu'a chaque
 * synchronisation : ces fonctions ajoutent aussi l'acteur qui ouvre le canal
 * (ex. un gestionnaire des departements, non membre), qu'un elagage
 * systematique expulserait a la premiere ouverture par un membre.
 */
export async function removeUserFromGroupConversation(
  scope: { departmentId: string } | { teamId: string } | { projectId: string },
  userId: string
) {
  await prisma.conversationParticipant.deleteMany({
    where: { userId, conversation: scope },
  });
}
