import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConversationFormDialog } from "@/components/messages/conversation-form-dialog";
import { Users } from "lucide-react";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [conversations, users] = await Promise.all([
    prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Messagerie</h1>
          <p className="text-sm text-muted-foreground">{conversations.length} conversation(s)</p>
        </div>
        <ConversationFormDialog users={users.map((u) => ({ id: u.id, label: u.name }))} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {conversations.map((conv) => {
          const otherParticipants = conv.participants.filter((p) => p.userId !== userId);
          const title = conv.isGroup
            ? conv.nom || otherParticipants.map((p) => p.user.name).join(", ")
            : otherParticipants[0]?.user.name ?? "Conversation";
          const lastMessage = conv.messages[0];

          return (
            <Link key={conv.id} href={`/messages/${conv.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-2">
                  {conv.isGroup && <Users className="h-4 w-4 text-muted-foreground" />}
                  <CardTitle className="text-base">{title}</CardTitle>
                  {conv.isGroup && <Badge variant="outline">Groupe</Badge>}
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {lastMessage ? lastMessage.content : "Aucun message pour le moment."}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {conversations.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune conversation pour le moment.</p>
        )}
      </div>
    </div>
  );
}
