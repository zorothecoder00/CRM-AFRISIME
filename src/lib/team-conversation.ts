import { prisma } from "@/lib/prisma";

/**
 * Fil de discussion d'équipe (cahier des charges §X, "Conversations
 * d'équipe"). Même principe que ensureProjectConversation : un seul canal
 * par équipe (Conversation.teamId unique), participants synchronisés sur
 * TeamMember à chaque ouverture.
 */
export async function ensureTeamConversation(teamId: string, actorUserId: string) {
  const [members, team] = await Promise.all([
    prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } }),
    prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { nom: true } }),
  ]);
  const memberIds = Array.from(new Set([...members.map((m) => m.userId), actorUserId]));

  const conversation = await prisma.conversation.upsert({
    where: { teamId },
    create: {
      teamId,
      nom: `Équipe : ${team.nom}`,
      isGroup: true,
      createdById: actorUserId,
      participants: { create: memberIds.map((userId) => ({ userId })) },
    },
    update: {},
    select: { id: true },
  });

  const existing = await prisma.conversationParticipant.findMany({
    where: { conversationId: conversation.id },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((p) => p.userId));
  const missing = memberIds.filter((id) => !existingIds.has(id));
  if (missing.length > 0) {
    await prisma.conversationParticipant.createMany({
      data: missing.map((userId) => ({ conversationId: conversation.id, userId })),
      skipDuplicates: true,
    });
  }

  return conversation.id;
}
