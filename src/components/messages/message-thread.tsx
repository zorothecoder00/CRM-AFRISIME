"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendMessage } from "@/actions/message.actions";
import { splitMentionSegments } from "@/lib/mentions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReactionPicker, type ReactionData } from "@/components/shared/reaction-picker";
import { UploadButton } from "@/lib/uploadthing";
import { Paperclip, X, FileText } from "lucide-react";

export type MessageData = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  reactions: ReactionData[];
  attachmentUrl: string | null;
  attachmentNom: string | null;
};

function MessageContent({ content }: { content: string }) {
  if (!content) return null;
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
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    nom: string;
    mimeType: string;
    sizeBytes: number;
  } | null>(null);

  async function handleSend() {
    if (!content.trim() && !pendingAttachment) return;
    setIsSubmitting(true);
    try {
      await sendMessage({
        conversationId,
        content: content.trim() || undefined,
        attachmentUrl: pendingAttachment?.url,
        attachmentNom: pendingAttachment?.nom,
        attachmentMimeType: pendingAttachment?.mimeType,
        attachmentSizeBytes: pendingAttachment?.sizeBytes,
      });
      setContent("");
      setPendingAttachment(null);
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
            {message.attachmentUrl && (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                {message.attachmentNom}
              </a>
            )}
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
      <div className="space-y-2 border-t pt-3">
        {pendingAttachment && (
          <div className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> {pendingAttachment.nom}
            </span>
            <button type="button" onClick={() => setPendingAttachment(null)} aria-label="Retirer la pièce jointe">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
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
          <div className="flex shrink-0 items-center gap-2">
            <UploadButton
              endpoint="documentUploader"
              appearance={{ button: "h-8 w-8 p-0", allowedContent: "hidden" }}
              content={{ button: <Paperclip className="h-4 w-4" />, allowedContent: "" }}
              onClientUploadComplete={(res) => {
                const file = res[0];
                if (!file) return;
                setPendingAttachment({
                  url: file.ufsUrl,
                  nom: file.name,
                  mimeType: file.type,
                  sizeBytes: file.size,
                });
              }}
              onUploadError={(err) => {
                toast.error(`Échec du téléversement : ${err.message}`);
              }}
            />
            <Button onClick={handleSend} disabled={isSubmitting}>
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
