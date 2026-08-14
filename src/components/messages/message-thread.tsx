"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAction } from "@/hooks/use-action";
import { sendMessage, markConversationRead, deleteMessage } from "@/actions/message.actions";
import { splitMentionSegments } from "@/lib/mentions";
import { Button } from "@/components/ui/button";
import { MentionTextarea, type MentionCandidate } from "@/components/shared/mention-textarea";
import { ReactionPicker, type ReactionData } from "@/components/shared/reaction-picker";
import { UserAvatar } from "@/components/messages/user-avatar";
import { UploadButton } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";
import { Paperclip, X, FileText, Send, Smile, Trash2 } from "lucide-react";

export type MessageData = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  createdAt: string;
  reactions: ReactionData[];
  attachmentUrl: string | null;
  attachmentNom: string | null;
  isDeleted: boolean;
};

const QUICK_EMOJIS = ["👍", "🎉", "✅", "❤️", "😂", "🙏", "👏", "🔥", "😮", "💡"];

function MessageContent({ content, mine, isDeleted }: { content: string; mine: boolean; isDeleted: boolean }) {
  if (isDeleted) {
    return (
      <p className={cn("text-sm italic", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
        Message supprimé
      </p>
    );
  }
  if (!content) return null;
  return (
    <p className="whitespace-pre-wrap text-sm">
      {splitMentionSegments(content).map((seg, i) =>
        seg.isMention ? (
          <span
            key={i}
            className={cn(
              "rounded px-1 font-medium",
              mine ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"
            )}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Emojis"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-warning/10 hover:text-warning"
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 flex w-56 flex-wrap gap-1 rounded-xl border bg-popover p-2 shadow-lg ring-1 ring-foreground/10">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  showAvatar,
  grouped,
  currentUserId,
}: {
  message: MessageData;
  mine: boolean;
  showAvatar: boolean;
  grouped: boolean;
  currentUserId: string;
}) {
  const { run: remove, isPending: isDeleting } = useAction(deleteMessage);

  return (
    <div
      className={cn(
        "group flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
        grouped ? "mt-0.5" : "mt-3"
      )}
    >
      {!mine && (
        <div className="w-7 shrink-0">
          {showAvatar && <UserAvatar name={message.authorName} image={message.authorImage} size="sm" />}
        </div>
      )}
      {mine && !message.isDeleted && (
        <button
          type="button"
          onClick={() => remove(message.id)}
          disabled={isDeleting}
          aria-label="Supprimer le message"
          className="mb-1 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <div className={cn("flex max-w-[75%] flex-col gap-1", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "space-y-1 rounded-2xl px-3.5 py-2 shadow-sm",
            mine
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm border bg-card text-card-foreground"
          )}
        >
          {message.attachmentUrl && (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
                mine ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/70"
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{message.attachmentNom}</span>
            </a>
          )}
          <MessageContent content={message.content} mine={mine} isDeleted={message.isDeleted} />
          <div className={cn("text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        {!message.isDeleted && (
          <ReactionPicker messageId={message.id} reactions={message.reactions} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
  mentionCandidates,
}: {
  conversationId: string;
  messages: MessageData[];
  currentUserId: string;
  mentionCandidates: MentionCandidate[];
}) {
  const [content, setContent] = useState("");
  const { run: send, isPending } = useAction(sendMessage);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    nom: string;
    mimeType: string;
    sizeBytes: number;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Marque le fil comme lu a l'ouverture et a chaque nouveau message qui y
  // arrive pendant qu'il est affiche (le polling de MessagesShell peut en
  // apporter sans que l'utilisateur navigue).
  useEffect(() => {
    markConversationRead(conversationId).catch(() => {
      // Silencieux : ce n'est qu'un marquage de lecture, pas une action bloquante.
    });
  }, [conversationId, messages.length]);

  async function handleSend() {
    if (!content.trim() && !pendingAttachment) return;
    const result = await send({
      conversationId,
      content: content.trim() || undefined,
      attachmentUrl: pendingAttachment?.url,
      attachmentNom: pendingAttachment?.nom,
      attachmentMimeType: pendingAttachment?.mimeType,
      attachmentSizeBytes: pendingAttachment?.sizeBytes,
    });
    if (result.ok) {
      setContent("");
      setPendingAttachment(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-1 overflow-y-auto bg-muted/20 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <p className="text-sm">Aucun message. Lancez la discussion !</p>
          </div>
        )}
        {messages.map((message, i) => {
          const mine = message.authorId === currentUserId;
          const previous = messages[i - 1];
          const showAvatar = !mine && (!previous || previous.authorId !== message.authorId);
          const grouped = !!previous && previous.authorId === message.authorId;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              mine={mine}
              showAvatar={showAvatar}
              grouped={grouped}
              currentUserId={currentUserId}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t bg-card p-3">
        {pendingAttachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 px-2.5 py-1.5 text-xs text-info">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{pendingAttachment.nom}</span>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              aria-label="Retirer la pièce jointe"
              className="ml-auto shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1">
          <EmojiPicker onPick={(e) => setContent((c) => c + e)} />
          <UploadButton
            endpoint="documentUploader"
            appearance={{ button: "h-9 w-9 rounded-full p-0", allowedContent: "hidden" }}
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
          <MentionTextarea
            placeholder="Écrire un message... (@Prénom pour mentionner)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            candidates={mentionCandidates}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            className="max-h-32 min-h-9 flex-1 resize-none rounded-2xl bg-muted/50 py-2"
          />
          <Button
            onClick={handleSend}
            disabled={isPending || (!content.trim() && !pendingAttachment)}
            size="icon"
            className="shrink-0 rounded-full"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
