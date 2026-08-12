"use client";

import { useAction } from "@/hooks/use-action";
import { publishArticle, unpublishArticle } from "@/actions/knowledge.actions";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export function PublishToggleButton({ articleId, statut }: { articleId: string; statut: string }) {
  const publish = useAction(publishArticle, { successMessage: "Article publié." });
  const unpublish = useAction(unpublishArticle, { successMessage: "Article repassé en brouillon." });
  const isPending = publish.isPending || unpublish.isPending;

  if (statut === "PUBLIE") {
    return (
      <Button size="sm" variant="outline" onClick={() => unpublish.run(articleId)} disabled={isPending}>
        <EyeOff className="mr-1 h-4 w-4" />
        Repasser en brouillon
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={() => publish.run(articleId)} disabled={isPending}>
      <Eye className="mr-1 h-4 w-4" />
      Publier
    </Button>
  );
}
