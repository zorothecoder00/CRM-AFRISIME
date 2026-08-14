import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { MessageThread, type MessageData } from "@/components/messages/message-thread";
import { UserAvatar } from "@/components/messages/user-avatar";
import { ArrowLeft } from "lucide-react";

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
    : (otherParticipants[0]?.user.name ?? "Conversation");

  const messages: MessageData[] = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    authorId: m.authorId,
    authorName: m.author.name,
    authorImage: m.author.image,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId, userName: r.user.name })),
    attachmentUrl: m.attachmentUrl,
    attachmentNom: m.attachmentNom,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b p-4">
        <Link href="/messages" className="shrink-0 text-muted-foreground hover:text-foreground md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <UserAvatar
          name={title}
          image={otherParticipants[0]?.user.image}
          isGroup={conversation.isGroup}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            {conversation.isGroup && <Badge variant="outline">Groupe</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.participants.map((p) => p.user.name).join(", ")}
          </p>
        </div>
      </div>
      <MessageThread
        conversationId={conversation.id}
        messages={messages}
        currentUserId={userId}
        mentionCandidates={otherParticipants.map((p) => ({ id: p.userId, name: p.user.name }))}
      />
    </div>
  );
}
