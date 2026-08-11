"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addSectionComment } from "@/actions/project.actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type SectionCommentData = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export function SectionCommentSection({
  sectionId,
  comments,
}: {
  sectionId: string;
  comments: SectionCommentData[];
}) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await addSectionComment({ sectionId, content: content.trim() });
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 && <p className="text-sm text-muted-foreground">Aucun commentaire.</p>}
      {comments.map((c) => (
        <div key={c.id} className="rounded-md border p-2.5 text-sm">
          <div className="mb-1 flex items-baseline gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{c.authorName}</span>
            {new Date(c.createdAt).toLocaleString("fr-FR")}
          </div>
          <p>{c.content}</p>
        </div>
      ))}
      <div className="space-y-2">
        <Textarea
          placeholder="Ajouter un commentaire..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
        />
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? "Envoi..." : "Commenter"}
        </Button>
      </div>
    </div>
  );
}
