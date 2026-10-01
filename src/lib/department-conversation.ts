import { prisma } from "@/lib/prisma";

/**
 * Canal de discussion d'un département (demande utilisateur 2026-10-01 :
 * "envoyer un message à un département"). Même principe que
 * ensureTeamConversation : un seul canal par département
 * (Conversation.departmentId unique), participants synchronisés sur les
 * utilisateurs actifs rattachés au département (User.departmentId) à chaque
 * ouverture — un nouveau membre y est donc ajouté automatiquement.
 */
export async function ensureDepartmentConversation(departmentId: string, actorUserId: string) {
  const [members, department] = await Promise.all([
    prisma.user.findMany({ where: { departmentId, isActive: true }, select: { id: true } }),
    prisma.department.findUniqueOrThrow({ where: { id: departmentId }, select: { name: true } }),
  ]);
  const memberIds = Array.from(new Set([...members.map((m) => m.id), actorUserId]));

  const conversation = await prisma.conversation.upsert({
    where: { departmentId },
    create: {
      departmentId,
      nom: `Département : ${department.name}`,
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
