import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTeamConversation } from "@/lib/team-conversation";
import { MessageThread, type MessageData } from "@/components/messages/message-thread";
import { Badge } from "@/components/ui/badge";

/** Discussion d'équipe (cahier des charges §X, "Conversations d'équipe"). */
export default async function TeamDiscussionPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const session = await getServerSession(authOptions);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { department: true, members: { include: { user: true } } },
  });
  if (!team) notFound();

  const conversationId = await ensureTeamConversation(team.id, session!.user.id);
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      messages: {
        include: { author: true, reactions: { include: { user: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{team.nom}</h1>
        <Badge variant="outline">{team.department.name}</Badge>
      </div>
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-lg border">
        <MessageThread
          conversationId={conversation.id}
          messages={messages}
          currentUserId={session!.user.id}
          mentionCandidates={team.members
            .filter((m) => m.userId !== session!.user.id)
            .map((m) => ({ id: m.userId, name: m.user.name }))}
        />
      </div>
    </div>
  );
}
