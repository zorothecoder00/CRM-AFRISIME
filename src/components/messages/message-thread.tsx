"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendMessage } from "@/actions/message.actions";
import { splitMentionSegments } from "@/lib/mentions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReactionPicker, type ReactionData } from "@/components/shared/reaction-picker";

export type MessageData = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  reactions: ReactionData[];
};

function MessageContent({ content }: { content: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm">
      {splitMentionSegments(content).map((seg, i) =>
        seg.isMention ? (
          <span key={i} className="rounded bg-primary/10 px-1 font-medium text-primary">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
}: {
  conversationId: string;
  messages: MessageData[];
  currentUserId: string;
}) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSend() {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await sendMessage({ conversationId, content: content.trim() });
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun message. Lancez la discussion !</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{message.authorName}</span>
              <span>{new Date(message.createdAt).toLocaleString("fr-FR")}</span>
            </div>
            <MessageContent content={message.content} />
            <div className="mt-2">
              <ReactionPicker
                messageId={message.id}
                reactions={message.reactions}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t pt-3">
        <Textarea
          placeholder="Écrire un message... (@Prénom pour mentionner)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
        />
        <Button onClick={handleSend} disabled={isSubmitting}>
          Envoyer
        </Button>
      </div>
    </div>
  );
}
