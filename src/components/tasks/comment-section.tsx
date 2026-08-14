"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addComment } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { ReactionPicker, type ReactionData } from "@/components/shared/reaction-picker";
import { MentionTextarea, type MentionCandidate } from "@/components/shared/mention-textarea";
import { splitMentionSegments } from "@/lib/mentions";

export type CommentData = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  reactions: ReactionData[];
};

export function CommentSection({
  taskId,
  comments,
  currentUserId,
  candidates,
}: {
  taskId: string;
  comments: CommentData[];
  currentUserId: string;
  candidates: MentionCandidate[];
}) {
  const [content, setContent] = useState("");
  const { run, isPending } = useAction(addComment);

  async function handleSubmit() {
    if (!content.trim()) return;
    const result = await run(taskId, content.trim());
    if (result.ok) setContent("");
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{comment.authorName}</span>
            <span>{new Date(comment.createdAt).toLocaleString("fr-FR")}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {splitMentionSegments(comment.content).map((seg, i) =>
              seg.isMention ? (
                <span key={i} className="rounded bg-primary/10 px-1 font-medium text-primary">
                  {seg.text}
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </p>
          <div className="mt-2">
            <ReactionPicker
              taskCommentId={comment.id}
              reactions={comment.reactions}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      ))}
      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun commentaire.</p>
      )}
      <div className="space-y-2">
        <MentionTextarea
          placeholder="Ajouter un commentaire... (@Prénom pour mentionner)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          candidates={candidates}
        />
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Envoi..." : "Commenter"}
        </Button>
      </div>
    </div>
  );
}
