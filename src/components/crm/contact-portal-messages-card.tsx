"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { replyPortalMessage } from "@/actions/portal.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";

export type ContactPortalMessageData = {
  id: string;
  authorType: "CONTACT" | "INTERNAL";
  content: string;
  createdAt: string;
};

/** Fil de messagerie portail (cahier des charges §16-18, "communiquer") depuis la fiche contact interne. */
export function ContactPortalMessagesCard({
  contactId,
  messages,
}: {
  contactId: string;
  messages: ContactPortalMessageData[];
}) {
  const [content, setContent] = useState("");
  const { run, isPending } = useAction(replyPortalMessage);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    const result = await run({ contactId, content: trimmed });
    if (result.ok) setContent("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Messages portail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                  message.authorType === "INTERNAL" ? "ml-auto bg-primary/10" : "bg-card"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(message.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <Textarea
            placeholder="Répondre au contact..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
          />
          <Button size="sm" onClick={handleSend} disabled={isPending || !content.trim()}>
            <Send className="mr-1 h-4 w-4" />
            Envoyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
