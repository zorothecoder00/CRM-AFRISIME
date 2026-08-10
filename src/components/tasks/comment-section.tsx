"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addComment } from "@/actions/task.actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type CommentData = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export function CommentSection({ taskId, comments }: { taskId: string; comments: CommentData[] }) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await addComment(taskId, content.trim());
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{comment.authorName}</span>
            <span>{new Date(comment.createdAt).toLocaleString("fr-FR")}</span>
          </div>
          <p className="mt-1 text-sm">{comment.content}</p>
        </div>
      ))}
      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun commentaire.</p>
      )}
      <div className="space-y-2">
        <Textarea
          placeholder="Ajouter un commentaire..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Envoi..." : "Commenter"}
        </Button>
      </div>
    </div>
  );
}
