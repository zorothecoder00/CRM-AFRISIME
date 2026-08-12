"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { notifyMany } from "@/lib/notify";
import { parseMentions } from "@/lib/mentions";
import { logAudit } from "@/lib/audit";
import {
  createConversationSchema,
  sendMessageSchema,
  addReactionSchema,
  type CreateConversationInput,
  type SendMessageInput,
  type AddReactionInput,
} from "@/lib/validations/message.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createConversation(input: CreateConversationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MESSAGE_CREATE);

  const data = createConversationSchema.parse(input);
  const allParticipantIds = Array.from(new Set([...data.participantIds, session.user.id]));
  const isGroup = allParticipantIds.length > 2;

  const conversation = await prisma.conversation.create({
    data: {
      nom: isGroup ? data.nom : undefined,
      isGroup,
      createdById: session.user.id,
      participants: {
        create: allParticipantIds.map((userId) => ({ userId })),
      },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "conversation.created",
    entityType: "Conversation",
    entityId: conversation.id,
    changes: { isGroup, participantCount: allParticipantIds.length },
  });

  revalidatePath("/messages");
  return conversation;
}

export async function sendMessage(input: SendMessageInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MESSAGE_CREATE);

  const data = sendMessageSchema.parse(input);

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: data.conversationId },
    include: { participants: { include: { user: true } } },
  });

  const isParticipant = conversation.participants.some((p) => p.userId === session.user.id);
  if (!isParticipant) {
    throw new Error("Vous ne faites pas partie de cette conversation.");
  }

  const message = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      authorId: session.user.id,
      content: data.content?.trim() || "",
      attachmentUrl: data.attachmentUrl,
      attachmentNom: data.attachmentNom,
      attachmentMimeType: data.attachmentMimeType,
      attachmentSizeBytes: data.attachmentSizeBytes,
    },
  });

  const mentionedIds = parseMentions(
    data.content ?? "",
    conversation.participants.map((p) => ({ id: p.userId, name: p.user.name }))
  );
  await notifyMany(mentionedIds, session.user.id, {
    type: "MENTION",
    titre: "Vous avez été mentionné(e) dans un message.",
    lien: `/messages/${data.conversationId}`,
    entityType: "Message",
    entityId: message.id,
  });

  await logAudit({
    userId: session.user.id,
    action: "message.sent",
    entityType: "Conversation",
    entityId: data.conversationId,
    changes: { messageId: message.id },
  });

  revalidatePath(`/messages/${data.conversationId}`);
  revalidatePath("/messages");
  return message;
}

/** Marque une conversation comme lue par l'utilisateur courant (appele a l'ouverture du fil). */
export async function markConversationRead(conversationId: string) {
  const session = await requireSession();

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
    data: { lastReadAt: new Date() },
  });

  revalidatePath("/messages");
}

export async function toggleReaction(input: AddReactionInput) {
  const session = await requireSession();

  const data = addReactionSchema.parse(input);

  if (data.taskCommentId) {
    requirePermission(session.user.permissions, PERMISSIONS.TASK_COMMENT);
  } else {
    requirePermission(session.user.permissions, PERMISSIONS.MESSAGE_CREATE);
  }

  const existing = await prisma.reaction.findFirst({
    where: {
      userId: session.user.id,
      emoji: data.emoji,
      taskCommentId: data.taskCommentId || null,
      messageId: data.messageId || null,
    },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: {
        emoji: data.emoji,
        userId: session.user.id,
        taskCommentId: data.taskCommentId || undefined,
        messageId: data.messageId || undefined,
      },
    });
  }

  if (data.taskCommentId) {
    const comment = await prisma.taskComment.findUniqueOrThrow({
      where: { id: data.taskCommentId },
      select: { taskId: true },
    });
    revalidatePath(`/taches/${comment.taskId}`);
  } else if (data.messageId) {
    const message = await prisma.message.findUniqueOrThrow({
      where: { id: data.messageId },
      select: { conversationId: true },
    });
    revalidatePath(`/messages/${message.conversationId}`);
  }
}
