import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toneForArticleStatus } from "@/lib/status-tone";
import { BookOpen } from "lucide-react";

export type ArticleRow = {
  id: string;
  titre: string;
  tags: string | null;
  statut: string;
  authorName: string;
  categoryName: string | null;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  PUBLIE: "Publié",
};

export function ArticleList({ articles }: { articles: ArticleRow[] }) {
  if (articles.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun article.</p>;
  }

  return (
    <ul className="space-y-2">
      {articles.map((article) => (
        <li key={article.id}>
          <Link href={`/base-de-connaissances/${article.id}`}>
            <Card
              size="sm"
              className="flex-row flex-wrap items-center justify-between gap-2 transition-all hover:-translate-y-0.5 hover:bg-muted/50 sm:flex-nowrap"
            >
              <div className="flex items-center gap-2 px-(--card-spacing)">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{article.titre}</div>
                  {article.categoryName && (
                    <div className="text-xs text-muted-foreground">{article.categoryName}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-(--card-spacing) text-xs text-muted-foreground">
                {article.tags &&
                  article.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                <Badge variant={toneForArticleStatus(article.statut)}>{STATUS_LABELS[article.statut]}</Badge>
                <span>{article.authorName}</span>
                <span>{new Date(article.updatedAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
