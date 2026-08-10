import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { MessageThread, type MessageData } from "@/components/messages/message-thread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: true } },
      messages: {
        include: { author: true, reactions: { include: { user: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation || !conversation.participants.some((p) => p.userId === userId)) {
    notFound();
  }

  const otherParticipants = conversation.participants.filter((p) => p.userId !== userId);
  const title = conversation.isGroup
    ? conversation.nom || otherParticipants.map((p) => p.user.name).join(", ")
    : otherParticipants[0]?.user.name ?? "Conversation";

  const messages: MessageData[] = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    authorId: m.authorId,
    authorName: m.author.name,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId, userName: r.user.name })),
  }));

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {conversation.isGroup && <Badge variant="outline">Groupe</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {conversation.participants.map((p) => p.user.name).join(", ")}
        </p>
      </div>
      <div className="flex-1 overflow-hidden rounded-md border p-3">
        <MessageThread conversationId={conversation.id} messages={messages} currentUserId={userId} />
      </div>
    </div>
  );
}
