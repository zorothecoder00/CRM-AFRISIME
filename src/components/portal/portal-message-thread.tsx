"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { sendPortalMessage } from "@/actions/portal.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export type PortalMessageData = {
  id: string;
  authorType: "CONTACT" | "INTERNAL";
  content: string;
  createdAt: string;
};

export function PortalMessageThread({ messages }: { messages: PortalMessageData[] }) {
  const [content, setContent] = useState("");
  const { run, isPending } = useAction(sendPortalMessage);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    const result = await run({ content: trimmed });
    if (result.ok) setContent("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                message.authorType === "CONTACT" ? "ml-auto bg-primary/10" : "bg-card"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString("fr-FR")}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="space-y-2">
        <Textarea
          placeholder="Écrire un message à l'équipe AfriSime..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <Button size="sm" onClick={handleSend} disabled={isPending || !content.trim()}>
          <Send className="mr-1 h-4 w-4" />
          Envoyer
        </Button>
      </div>
    </div>
  );
}
