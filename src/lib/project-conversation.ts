import { prisma } from "@/lib/prisma";

/**
 * Fil de discussion de projet (cahier des charges §10). Un seul canal par
 * projet (Conversation.projectId unique), dont les participants sont
 * synchronises sur l'equipe courante (ProjectMember) a chaque ouverture,
 * plutot que geres manuellement comme une conversation privee classique.
 */
export async function ensureProjectConversation(projectId: string, actorUserId: string) {
  const [members, project] = await Promise.all([
    prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
    prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { nom: true } }),
  ]);
  const memberIds = Array.from(new Set([...members.map((m) => m.userId), actorUserId]));

  const conversation = await prisma.conversation.upsert({
    where: { projectId },
    create: {
      projectId,
      nom: `Projet : ${project.nom}`,
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
