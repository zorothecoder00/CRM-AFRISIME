import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessagesShell, type ConversationListItem } from "@/components/messages/messages-shell";
import { ConversationFormDialog } from "@/components/messages/conversation-form-dialog";

export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [conversations, users] = await Promise.all([
    prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" } }),
  ]);

  const unreadCounts = await Promise.all(
    conversations.map((conv) => {
      const mine = conv.participants.find((p) => p.userId === userId);
      return prisma.message.count({
        where: {
          conversationId: conv.id,
          authorId: { not: userId },
          createdAt: { gt: mine?.lastReadAt ?? new Date(0) },
        },
      });
    })
  );

  const items: ConversationListItem[] = conversations
    .map((conv, i) => {
      const others = conv.participants.filter((p) => p.userId !== userId);
      const title = conv.isGroup
        ? conv.nom || others.map((p) => p.user.name).join(", ")
        : (others[0]?.user.name ?? "Conversation");
      const lastMessage = conv.messages[0];
      const preview = lastMessage
        ? (lastMessage.authorId === userId ? "Vous : " : "") +
          (lastMessage.content || (lastMessage.attachmentNom ? `📎 ${lastMessage.attachmentNom}` : ""))
        : "Aucun message pour le moment.";

      return {
        id: conv.id,
        title,
        isGroup: conv.isGroup,
        avatarUser: conv.isGroup
          ? null
          : others[0]
            ? { name: others[0].user.name, image: others[0].user.image }
            : null,
        lastMessagePreview: preview,
        lastMessageAt: (lastMessage?.createdAt ?? conv.createdAt).toISOString(),
        unreadCount: unreadCounts[i],
      };
    })
    // Conversation model n'a pas de champ updatedAt : on trie par activite
    // reelle (dernier message), pas par date de creation de la conversation.
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return (
    <MessagesShell
      conversations={items}
      headerAction={
        <ConversationFormDialog users={users.map((u) => ({ id: u.id, label: u.name }))} variant="icon" />
      }
    >
      {children}
    </MessagesShell>
  );
}
